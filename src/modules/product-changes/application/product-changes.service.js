/**
 * @fileoverview Product change audit service.
 *
 * Responsibilities:
 *  - Create immutable audit entries for product lifecycle changes.
 *  - Retrieve change history (sorted newest first).
 *
 * Data Model:
 *  - Stores previousValues and newValues as JSON strings (immutable snapshots).
 *
 * Consistency:
 *  - Caller responsible for constructing business field subset (service does not diff).
 *
 * Future:
 *  - Add pagination for very large histories.
 *  - Add actor enrichment (e.g. caching user lookups).
 */
const BaseService = require("../../../_shared/service/base.service");
const ProductChange = require("../domain/product-change.schema");

class ProductChangeService extends BaseService {
  constructor() {
    super(ProductChange);
  }

  /**
   * Create audit record.
   * @param {string|ObjectId} productId
   * @param {string|ObjectId} changedBy
   * @param {"CREATE"|"UPDATE"|"STATUS_CHANGE"} operation
   * @param {object} previous
   * @param {object} next
   */
  async createAudit(productId, changedBy, operation, previous = {}, next = {}) {
    try {
      const payload = {
        productId,
        changedBy,
        changedAt: new Date(),
        previousValues: JSON.stringify(previous || {}),
        newValues: JSON.stringify(next || {}),
        operation,
      };
      return await this.create(payload);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Retrieve audit history in reverse chronological order.
   * @param {string|ObjectId} productId
   */
  async findByProduct(productId) {
    try {
      const docs = await this.model
        .find({ productId, deletedAt: null })
        .sort({ changedAt: -1 })
        .lean()
        .exec();
      return { status: 200, data: docs };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

module.exports = new ProductChangeService();