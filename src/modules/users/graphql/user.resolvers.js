/**
 * @fileoverview GraphQL resolvers for User entity.
 *
 * Patterns:
 *  - Validate inputs via DTO.
 *  - Use service layer (never query model directly here).
 *  - Provide pagination metadata consistent with other modules.
 *
 * Security:
 *  - Excludes password and tests (selectOptions).
 *  - Authorization handled by @auth at schema level plus role scoping within it.
 */
const UserService = require("../application/user.service");
const userPopulate = require("../domain/user.populate");
const createUserDto = require("../domain/user.dto");
const updateUserDto = require("../domain/userUpdate.dto");
const { unwrap, toGraphQLError } = require("../../../graphql/error.utils");

const selectOptions = "-password -tests";

module.exports = {
  Query: {
    user: async (_parent, { id }) => {
      const result = await UserService.findById(id, userPopulate, selectOptions);
      return unwrap(result, "Failed to fetch user");
    },

    users: async (_parent, { page = 0, limit = 10, filter }) => {
      const result = await UserService.findAll(
        page,
        limit,
        filter,
        userPopulate,
        selectOptions
      );

      if (result.status >= 400) {
        throw toGraphQLError(result, "Failed to list users");
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
    createUser: async (_parent, { input }) => {
      await createUserDto.validateAsync(input, { abortEarly: false });
      const result = await UserService.create(
        input,
        userPopulate,
        selectOptions
      );
      return unwrap(result, "Failed to create user");
    },

    updateUser: async (_parent, { id, input }) => {
      await updateUserDto.validateAsync(input, { abortEarly: false });
      const result = await UserService.updateById(
        id,
        input,
        userPopulate,
        selectOptions
      );
      return unwrap(result, "Failed to update user");
    },

    softDeleteUser: async (_parent, { id }) => {
      const result = await UserService.softDeleteById(
        id,
        userPopulate,
        selectOptions
      );
      return unwrap(result, "Failed to soft delete user");
    },
  },

  User: {
    id: (user) => user.id || user._id?.toString(),
    role: (user) => user.role,
    lastUsedRole: (user) => user.lastUsedRole,
  },
};