/**
 * @fileoverview GraphQL resolvers for Role entity.
 *
 * Responsibilities:
 *  - Wrap RoleService CRUD operations.
 *  - Provide pagination metadata (derived from service pagination object).
 *  - Enforce validation via Joi DTOs (create/update).
 *
 * Error Handling:
 *  - unwrap() throws GraphQL errors where appropriate.
 *  - Explicit conversion for list operations to GraphQL page structure.
 *
 * Future:
 *  - Add bulk role operations.
 *  - Add permission enumeration per role if/when supported.
 */
const RoleService = require("../application/role.service");
const roleCreateDto = require("../domain/role.dto");
const roleUpdateDto = require("../domain/roleUpdate.dto");
const { unwrap, toGraphQLError } = require("../../../graphql/error.utils");

module.exports = {
  Query: {
    role: async (_p, { id }) => {
      const result = await RoleService.findById(id);
      return unwrap(result, "Failed to fetch role");
    },

    roles: async (_p, { page = 0, limit = 10, filter }) => {
      const result = await RoleService.findAll(page, limit, filter);
      if (result.status >= 400) {
        throw toGraphQLError(result, "Failed to list roles");
      }

      const { data = [], pagination = {} } = result;
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
    createRole: async (_p, { input }) => {
      await roleCreateDto.validateAsync(input, { abortEarly: false });
      const result = await RoleService.create(input);
      return unwrap(result, "Failed to create role");
    },

    updateRole: async (_p, { id, input }) => {
      await roleUpdateDto.validateAsync(input, { abortEarly: false });
      const result = await RoleService.updateById(id, input);
      return unwrap(result, "Failed to update role");
    },

    softDeleteRole: async (_p, { id }) => {
      const result = await RoleService.softDeleteById(id);
      return unwrap(result, "Failed to soft delete role");
    },

    deleteRolePermanent: async (_p, { id }) => {
      const result = await RoleService.deleteById(id);
      if (result.status >= 400) {
        throw toGraphQLError(result, "Failed to delete role");
      }
      return true;
    },
  },

  Role: {
    id: (role) => role.id || role._id?.toString(),
  },
};