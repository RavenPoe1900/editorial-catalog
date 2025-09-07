/**
 * @fileoverview ProductService: business logic for product lifecycle.
 *
 * Responsibilities:
 *  - Enforce editorial workflow: provider submissions -> editor approvals.
 *  - Record audit trails for creates/updates/status changes.
 *  - Publish domain events to RabbitMQ (best-effort, never block writes).
 *  - Maintain search index sync in Elasticsearch (best-effort).
 *
 * Workflow Rules:
 *  - Provider-created products start as PENDING_REVIEW.
 *  - Editor-created products auto-publish (PUBLISHED).
 *  - Only EDITOR may approve PENDING_REVIEW -> PUBLISHED.
 *  - Provider can update only own PENDING_REVIEW items.
 *
 * Resilience:
 *  - RabbitMQ + ES updates are non-transactional. Failures are logged but do not abort DB change.
 *  - Future: consider outbox pattern if at-least-once event emission required.
 *
 * Security:
 *  - Authorization scope (role checks) done here layered on top of GraphQL @auth directive.
 *
 * Consistency Model:
 *  - ES index may be eventually consistent relative to MongoDB.
 *  - No distributed transaction or saga implemented (deliberate).
 */
const BaseService = require("../../../_shared/service/base.service");
const Product = require("../domain/product.schema");
const RoleTypeEnum = require("../../../_shared/enum/roles.enum");
const ProductChangeService = require("../../product-changes/application/product-changes.service");
const { ProductStatus } = require("../domain/product.enum");
const { computeAuditDiff } = require("./diff.util");
const { publish: publishEvent } = require("../../../_shared/integrations/rabbitmq/rabbitmq");
const { upsertProduct } = require("../../../_shared/integrations/elasticsearch/es.product.indexer");

class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  /**
   * Build a canonical domain event envelope.
   * @param {string} type - e.g. 'product.created'
   * @param {string|ObjectId} aggregateId
   * @param {object} data - Event-specific payload
   * @param {object} actor - { userId }
   */
  buildEventEnvelope(type, aggregateId, data, actor) {
    return {
      id: `${type}:${aggregateId}:${Date.now()}`, // Simple unique key; consider ULID for sorting.
      type,
      occurredAt: new Date().toISOString(),
      aggregateType: "Product",
      aggregateId: String(aggregateId),
      actor: actor?.userId ? String(actor.userId) : null,
      data,
    };
  }

  /**
   * Create product enforcing role-based initial status.
   * Side Effects:
   *  - Writes product
   *  - Inserts audit record
   *  - Publishes rabbit event (best-effort)
   *  - Indexes in ES (best-effort)
   */
  async createWithRole(actor, input, populateOptions = [], selectOptions = null) {
    try {
      const role = (actor?.role || "").toLowerCase();
      const status =
        role === RoleTypeEnum.EDITOR
          ? ProductStatus.PUBLISHED
          : ProductStatus.PENDING_REVIEW;

      const payload = {
        ...input,
        status,
        createdBy: actor.userId,
      };

      const created = await this.create(payload, populateOptions, selectOptions);
      if (created.status >= 400) return created;

      await ProductChangeService.createAudit(
        created.data._id,
        actor.userId,
        "CREATE",
        {},
        {
          gtin: created.data.gtin,
            name: created.data.name,
            description: created.data.description,
            brand: created.data.brand,
            manufacturer: created.data.manufacturer,
            netWeight: created.data.netWeight,
            weightUnit: created.data.weightUnit,
            status: created.data.status,
        }
      );

      // Event emission (non-critical)
      const evt = this.buildEventEnvelope(
        "product.created",
        created.data._id,
        {
          productId: String(created.data._id),
          status: created.data.status,
          gtin: created.data.gtin,
        },
        actor
      );
      publishEvent("product.created", evt);

      // Index sync (non-critical)
      upsertProduct(created.data);

      return created;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update product with audit diff generation.
   * Constraints:
   *  - Providers may only modify owned PENDING_REVIEW items.
   *  - Providers cannot change status field.
   *
   * AUDIT:
   *  - If no business-relevant fields changed -> returns existing doc (no new audit).
   */
  async updateWithAudit(actor, id, updates, populateOptions = [], selectOptions = null) {
    try {
      const role = (actor?.role || "").toLowerCase();

      const currentRes = await this.findById(id);
      if (currentRes.status !== 200) return currentRes;
      const current = currentRes.data;

      if (role === RoleTypeEnum.PROVIDER) {
        const isOwner = String(current.createdBy) === String(actor.userId);
        if (!isOwner) {
          return { status: 403, error: "Forbidden: not the owner of this product" };
        }
        if (current.status !== ProductStatus.PENDING_REVIEW) {
          return { status: 400, error: "Only pending products can be updated by provider" };
        }
        if (Object.prototype.hasOwnProperty.call(updates, "status")) {
          return { status: 400, error: "Status changes are not allowed in this operation" };
        }
      }

      const { previous, next } = computeAuditDiff(current, updates);
      const hasChanges =
        Object.keys(next).length > 0 &&
        JSON.stringify(previous) !== JSON.stringify(next);

      if (!hasChanges) {
        // Return full doc to keep calling layer logic simple (no special code path for "no-op")
        return this.findById(id, populateOptions, selectOptions);
      }

      const updated = await this.updateById(
        id,
        updates,
        populateOptions,
        selectOptions
      );
      if (updated.status >= 400) return updated;

      await ProductChangeService.createAudit(
        id,
        actor.userId,
        "UPDATE",
        previous,
        next
      );

      const evt = this.buildEventEnvelope(
        "product.updated",
        id,
        {
          productId: String(id),
          changed: Object.keys(updates),
        },
        actor
      );
      publishEvent("product.updated", evt);

      upsertProduct(updated.data);

      return updated;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Approve pending product (EDITOR only).
   * State Transition: PENDING_REVIEW -> PUBLISHED
   */
  async approvePending(actor, id, populateOptions = [], selectOptions = null) {
    try {
      const role = (actor?.role || "").toLowerCase();
      if (role !== RoleTypeEnum.EDITOR) {
        return { status: 403, error: "Forbidden: only editors can approve products" };
      }

      const currentRes = await this.findById(id);
      if (currentRes.status !== 200) return currentRes;
      const current = currentRes.data;

      if (current.status !== ProductStatus.PENDING_REVIEW) {
        return { status: 400, error: "Only pending products can be approved" };
      }

      const updates = { status: ProductStatus.PUBLISHED };
      const updated = await this.updateById(
        id,
        updates,
        populateOptions,
        selectOptions
      );
      if (updated.status >= 400) return updated;

      await ProductChangeService.createAudit(
        id,
        actor.userId,
        "STATUS_CHANGE",
        { status: current.status },
        { status: ProductStatus.PUBLISHED }
      );

      const evt = this.buildEventEnvelope(
        "product.approved",
        id,
        {
          productId: String(id),
          status: ProductStatus.PUBLISHED,
        },
        actor
      );
      publishEvent("product.approved", evt);

      upsertProduct(updated.data);

      return updated;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Query products with advanced filters (search + brand + status + createdBy).
   * Uses regex for case-insensitive partial matches (NOT index-friendly at scale).
   * FUTURE:
   *  - Consider adding text indexes or leveraging ES for full-text queries.
   */
  async findAllWithFilters(
    page = 0,
    limit = 10,
    filter = {},
    populateOptions = [],
    selectOptions = null,
    sort = { createdAt: -1 }
  ) {
    try {
      const { search, brand, status, createdBy } = filter || {};
      const q = {};

      if (search && typeof search === "string" && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        q.$or = [{ name: regex }, { brand: regex }, { description: regex }];
      }

      if (brand) q.brand = brand;
      if (status) q.status = status;
      if (createdBy) q.createdBy = createdBy;

      return await super.findAll(
        page,
        limit,
        q,
        populateOptions,
        selectOptions,
        sort
      );
    } catch (error) {
      return this.handleError(error);
    }
  }
}

module.exports = new ProductService();