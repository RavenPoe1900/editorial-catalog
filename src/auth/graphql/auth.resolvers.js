const AuthService = require("../application/auth.service");
const authDto = require("../domain/auth.dto");
const userService = require("../../modules/users/application/user.service");
const userPopulate = require("../../modules/users/domain/user.populate");
const { unwrap } = require("../../graphql/error.utils");

const selectOptions = "-password -tests";

/**
 * Auth resolvers:
 * - register/login return access + refresh tokens.
 * - refreshToken rotates the refresh token.
 * - me returns the current user (requires @auth).
 */
module.exports = {
  Query: {
    me: async (_p, _args, ctx) => {
      if (!ctx.user?.userId) {
        const err = new Error("Unauthenticated");
        err.status = 401;
        throw err;
      }
      const result = await userService.findById(
        ctx.user.userId,
        userPopulate,
        selectOptions
      );
      return unwrap(result, "Failed to fetch current user");
    },
  },

  Mutation: {
    register: async (_p, { input }, _ctx) => {
      await authDto.validateAsync(input, { abortEarly: false });
      const result = await AuthService.register(input.email, input.password);
      return unwrap(result, "Failed to register");
    },

    login: async (_p, { input }, _ctx) => {
      await authDto.validateAsync(input, { abortEarly: false });
      const result = await AuthService.login(input.email, input.password);
      return unwrap(result, "Failed to login");
    },

    refreshToken: async (_p, { refreshToken }, _ctx) => {
      const result = await AuthService.refreshToken(refreshToken);
      return unwrap(result, "Failed to refresh token");
    },
  },
};