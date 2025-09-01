const RoleService = require("../application/role.service");
const roleCreateDto = require("../domain/role.dto");
const roleUpdateDto = require("../domain/roleUpdate.dto");
const { unwrap, toGraphQLError } = require("../../../graphql/error.utils");

/**
 * Role resolvers: query single/multiple roles and mutate them.
 * Reuses service layer and Joi validation.
 */
module.exports = {
  Query: {
    role: async (_p, { id }, _ctx) => {
      const result = await RoleService.findById(id);
      return unwrap(result, "Failed to fetch role");
    },

    roles: async (_p, { page = 0, limit = 10, filter }, _ctx) => {
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
    createRole: async (_p, { input }, _ctx) => {
      await roleCreateDto.validateAsync(input, { abortEarly: false });
      const result = await RoleService.create(input);
      return unwrap(result, "Failed to create role");
    },

    updateRole: async (_p, { id, input }, _ctx) => {
      await roleUpdateDto.validateAsync(input, { abortEarly: false });
      const result = await RoleService.updateById(id, input);
      return unwrap(result, "Failed to update role");
    },

    softDeleteRole: async (_p, { id }, _ctx) => {
      const result = await RoleService.softDeleteById(id);
      return unwrap(result, "Failed to soft delete role");
    },

    deleteRolePermanent: async (_p, { id }, _ctx) => {
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