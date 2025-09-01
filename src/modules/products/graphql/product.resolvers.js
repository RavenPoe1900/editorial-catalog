/**
 * Product resolvers implementing editorial workflow and audit history.
 * - Reuse service layer and Joi DTOs.
 * - Protect operations with @auth in SDL; here we enforce fine-grained rules.
 */

const ProductService = require("../application/product.service");
const ProductChangeService = require("../../product-changes/application/product-changes.service");
const createDto = require("../domain/product.dto");
const updateDto = require("../domain/productUpdate.dto");
const productPopulate = require("../domain/product.populate");
const { unwrap, toGraphQLError } = require("../../../graphql/error.utils");

const selectOptions = null;

module.exports = {
  Query: {
    product: async (_p, { id }, _ctx) => {
      const res = await ProductService.findById(id, productPopulate, selectOptions);
      return unwrap(res, "Failed to fetch product");
    },

    products: async (_p, { page = 0, limit = 10, filter }, _ctx) => {
      const res = await ProductService.findAllWithFilters(
        page,
        limit,
        filter,
        productPopulate,
        selectOptions
      );

      if (res.status >= 400) throw toGraphQLError(res, "Failed to list products");

      const { data = [], pagination = {} } = res;
      return {
        items: data,
        pageInfo: {
          page: pagination.currentPage ?? page,
          limit: pagination.pageSize ?? limit,
          totalItems: pagination.totalDocs ?? data.length,
          totalPages: pagination.totalPages ?? 1,
          hasNextPage:
            typeof pagination.currentPage === "number" &&
            typeof pagination.totalPages === "number"
              ? pagination.currentPage + 1 < pagination.totalPages
              : false,
          hasPrevPage:
            typeof pagination.currentPage === "number"
              ? pagination.currentPage > 0
              : false,
        },
      };
    },
  },

  Mutation: {
    createProduct: async (_p, { input }, ctx) => {
      await createDto.validateAsync(input, { abortEarly: false });
      const actor = { userId: ctx.user.userId, role: ctx.user.role };
      const res = await ProductService.createWithRole(
        actor,
        input,
        productPopulate,
        selectOptions
      );
      return unwrap(res, "Failed to create product");
    },

    updateProduct: async (_p, { id, input }, ctx) => {
      await updateDto.validateAsync(input, { abortEarly: false });
      const actor = { userId: ctx.user.userId, role: ctx.user.role };
      const res = await ProductService.updateWithAudit(
        actor,
        id,
        input,
        productPopulate,
        selectOptions
      );
      return unwrap(res, "Failed to update product");
    },

    approveProduct: async (_p, { id }, ctx) => {
      const actor = { userId: ctx.user.userId, role: ctx.user.role };
      const res = await ProductService.approvePending(
        actor,
        id,
        productPopulate,
        selectOptions
      );
      return unwrap(res, "Failed to approve product");
    },
  },

  Product: {
    id: (doc) => doc.id || doc._id?.toString(),
    changes: async (doc) => {
      const res = await ProductChangeService.findByProduct(doc._id || doc.id);
      return unwrap(res, "Failed to fetch changes");
    },
  },

  ProductChange: {
    id: (doc) => doc.id || doc._id?.toString(),
    productId: (doc) => doc.productId?.toString(),
  },
};