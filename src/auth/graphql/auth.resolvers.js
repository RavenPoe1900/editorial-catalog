const AuthService = require("../application/auth.service");
const { loginDto, registerDto } = require("../domain/auth.dto");
const userService = require("../../modules/users/application/user.service");
const userPopulate = require("../../modules/users/domain/user.populate");
const { unwrap } = require("../../graphql/error.utils");

const selectOptions = "-password -tests";

/**
 * Auth resolvers:
 * - register/login return access + refresh tokens and the current user.
 * - refreshToken rotates the refresh token and returns user.
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
      // Validación del input de registro
      if (registerDto?.validateAsync) {
        await registerDto.validateAsync(input, { abortEarly: false });
      }
      const result = await AuthService.register(input);
      return unwrap(result, "Failed to register");
    },

    login: async (_p, { input }, _ctx) => {
      // Validación del input de login
      if (loginDto?.validateAsync) {
        await loginDto.validateAsync(input, { abortEarly: false });
      }
      const result = await AuthService.login(input.email, input.password);
      return unwrap(result, "Failed to login");
    },

    refreshToken: async (_p, { refreshToken }, _ctx) => {
      const result = await AuthService.refreshToken(refreshToken);
      return unwrap(result, "Failed to refresh token");
    },
  },

  // Resolver de campo para incluir el usuario en la respuesta
  AuthTokens: {
    user: (parent) => parent.user,
  },
};