/**
 * Service layer for ProductChange model:
 * - Creates audit entries for product operations.
 * - Queries change history for a given product.
 */

const BaseService = require("../../../_shared/service/base.service");
const ProductChange = require("../domain/product-change.schema");

class ProductChangeService extends BaseService {
  constructor() {
    super(ProductChange);
  }

  /**
   * Create an audit record for a product operation.
   * @param {string} productId
   * @param {string} changedBy - User id (ObjectId string)
   * @param {"CREATE"|"UPDATE"|"STATUS_CHANGE"} operation
   * @param {object} previous - Previous snapshot (business fields only)
   * @param {object} next - Next snapshot (business fields only)
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
   * Get change history for a product, latest first.
   * @param {string} productId
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