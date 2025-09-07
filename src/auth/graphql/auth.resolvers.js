/**
 * @fileoverview GraphQL resolvers for authentication.
 *
 * Responsibilities:
 *  - Wrap AuthService methods, perform DTO validation, normalize errors to GraphQL.
 *  - Provide "me" query which relies on context user (decoded in context builder).
 *
 * Error Handling:
 *  - unwrap() converts service responses into GraphQL return values or throws GraphQLError.
 *  - Invalid credentials intentionally generic (security best practice).
 *
 * Security:
 *  - @auth directive enforced at schema for me (defense in depth: we still check ctx.user).
 */
const AuthService = require("../application/auth.service");
const { loginDto, registerDto } = require("../domain/auth.dto");
const userService = require("../../modules/users/application/user.service");
const userPopulate = require("../../modules/users/domain/user.populate");
const { unwrap } = require("../../graphql/error.utils");

const selectOptions = "-password -tests";

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
    register: async (_p, { input }) => {
      if (registerDto?.validateAsync) {
        await registerDto.validateAsync(input, { abortEarly: false });
      }
      const result = await AuthService.register(input);
      return unwrap(result, "Failed to register");
    },

    login: async (_p, { input }) => {
      if (loginDto?.validateAsync) {
        await loginDto.validateAsync(input, { abortEarly: false });
      }
      const result = await AuthService.login(input.email, input.password);
      return unwrap(result, "Failed to login");
    },

    refreshToken: async (_p, { refreshToken }) => {
      const result = await AuthService.refreshToken(refreshToken);
      return unwrap(result, "Failed to refresh token");
    },
  },

  AuthTokens: {
    user: (parent) => parent.user,
  },
};