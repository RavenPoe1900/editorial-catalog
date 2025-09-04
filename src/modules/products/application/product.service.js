/**
 * Service layer for Product model with editorial workflow, auditing,
 * RabbitMQ events and Elasticsearch indexing.
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

  buildEventEnvelope(type, aggregateId, data, actor) {
    return {
      id: `${type}:${aggregateId}:${Date.now()}`,
      type, // e.g., product.created
      occurredAt: new Date().toISOString(),
      aggregateType: "Product",
      aggregateId: String(aggregateId),
      actor: actor?.userId ? String(actor.userId) : null,
      data,
    };
  }

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

      // Publish event (best-effort)
      const evt = this.buildEventEnvelope("product.created", created.data._id, {
        productId: String(created.data._id),
        status: created.data.status,
        gtin: created.data.gtin,
      }, actor);
      publishEvent("product.created", evt);

      // Update search index (best-effort)
      upsertProduct(created.data);

      return created;
    } catch (error) {
      return this.handleError(error);
    }
  }

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
        return this.findById(id, populateOptions, selectOptions);
      }

      const updated = await this.updateById(
        id,
        updates,
        populateOptions,
        selectOptions
      );
      if (updated.status >= 400) return updated;

      await ProductChangeService.createAudit(id, actor.userId, "UPDATE", previous, next);

      // Publish event
      const evt = this.buildEventEnvelope("product.updated", id, {
        productId: String(id),
        changed: Object.keys(updates),
      }, actor);
      publishEvent("product.updated", evt);

      // Update search index
      upsertProduct(updated.data);

      return updated;
    } catch (error) {
      return this.handleError(error);
    }
  }

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

      // Publish event
      const evt = this.buildEventEnvelope("product.approved", id, {
        productId: String(id),
        status: ProductStatus.PUBLISHED,
      }, actor);
      publishEvent("product.approved", evt);

      // Update search index
      upsertProduct(updated.data);

      return updated;
    } catch (error) {
      return this.handleError(error);
    }
  }

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