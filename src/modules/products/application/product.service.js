/**
 * Service layer for Product model with editorial workflow and auditing:
 * - createWithRole: create product with status based on role (provider/editor)
 * - updateWithAudit: update fields with permission checks and audit trail
 * - approvePending: editor-only status change from pending to published
 * - findAllWithFilters: textual search on name/brand/description and other filters
 *
 * Note: later you can emit domain events here (TODO) to integrate a message bus/ES indexer.
 */

const BaseService = require("../../../_shared/service/base.service");
const Product = require("../domain/product.schema");
const RoleTypeEnum = require("../../../_shared/enum/roles.enum");
const ProductChangeService = require("./../../product-changes/application/product-changes.service");
const { ProductStatus } = require("../domain/product.enum");
const { computeAuditDiff } = require("./diff.util");

class ProductService extends BaseService {
  constructor() {
    super(Product);
  }

  /**
   * Create a product with role-aware initial status and audit the creation.
   * @param {{ userId: string, role?: string }} actor
   * @param {object} input - Product payload
   * @param {Array} populateOptions
   * @param {string|null} selectOptions
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

      // TODO: emit domain event "product.created" for future bus/ES sync

      return created;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update a product with role-based permission checks and audit trail.
   * - provider: can only update own products while status is PENDING_REVIEW.
   * - editor: can update any product.
   * - Status changes should be done via approvePending (editor-only).
   * @param {{ userId: string, role?: string }} actor
   * @param {string} id - Product id
   * @param {object} updates - Partial update payload (business fields)
   * @param {Array} populateOptions
   * @param {string|null} selectOptions
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

      // TODO: emit domain event "product.updated" for future bus/ES sync

      return updated;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Editor-only approval flow: set status from PENDING_REVIEW to PUBLISHED and audit.
   * @param {{ userId: string, role?: string }} actor
   * @param {string} id - Product id
   * @param {Array} populateOptions
   * @param {string|null} selectOptions
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

      // TODO: emit domain event "product.approved" for future bus/ES sync

      return updated;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find all products with business-friendly filters and simple text search.
   * - search: matches name/brand/description (case-insensitive, partial)
   * - brand: exact match
   * - status: exact match
   * - createdBy: by user id
   * @param {number} page
   * @param {number} limit
   * @param {{ search?: string, brand?: string, status?: string, createdBy?: string }} filter
   * @param {Array} populateOptions
   * @param {string|null} selectOptions
   * @param {object} sort
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