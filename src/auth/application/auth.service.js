const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../_shared/config/config");
const userService = require("../../modules/users/application/user.service");
const RoleService = require("../../modules/roles/application/role.service");
const RefreshToken = require("../domain/refresh-token.schema");
const { hashPassword, comparePassword } = require("../../_shared/hash/password.hash");
const userPopulate = require("../../modules/users/domain/user.populate");

/**
 * Generate a refresh token with a unique JTI stored in DB.
 * The token (JWT) includes { userId, jti } and an exp claim.
 */
const generateRefreshToken = async (userId) => {
  const jti =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

  const token = jwt.sign({ userId, jti }, config.REFRESH_JWT.refreshKey, {
    expiresIn: config.REFRESH_JWT.refreshExpires,
  });

  const decoded = jwt.decode(token);
  let expiresAt = new Date();
  if (decoded && decoded.exp) {
    expiresAt = new Date(decoded.exp * 1000);
  } else {
    const fallbackMs = 7 * 24 * 60 * 60 * 1000;
    expiresAt.setTime(expiresAt.getTime() + fallbackMs);
  }

  await RefreshToken.create({ jti, expiresAt, userId });
  return token;
};

/**
 * Register a new user with a specific role and issue tokens.
 * Acepta el objeto 'input' completo: { email, password, name, role }
 * Devuelve: { accessToken, refreshToken, user }
 */
exports.register = async (input) => {
  try {
    const { email, password, name, role } = input;

    const existing = await userService.findByEmail(email);
    if (existing && existing.status === 200) {
      return { status: 400, error: "User already exists" };
    }

    const hash = await hashPassword(password);

    // Busca el rol por nombre de forma case-insensitive
    const roleRes = await RoleService.findOneByCriteria({
      name: new RegExp(`^${role}$`, "i"),
    });
    if (!roleRes || roleRes.status !== 200) {
      return { status: 404, error: `Role '${role}' not found` };
    }
    const roleId = roleRes.data._id;

    // Crea el usuario con todos los datos
    const userRes = await userService.create({
      email,
      password: hash,
      name,
      role: roleId,
    });
    if (!userRes || userRes.status !== 201) {
      return { status: 500, error: "Could not create user" };
    }

    // Obtiene el usuario completo con populate (sin password)
    const populatedUserRes = await userService.findById(
      userRes.data._id,
      userPopulate,
      "-password"
    );
    if (!populatedUserRes || populatedUserRes.status !== 200) {
      return { status: 500, error: "Could not load created user" };
    }
    const user = populatedUserRes.data;

    // Genera tokens incluyendo el nombre del rol en el access token
    const payload = { userId: user._id, role: user.role?.name || null };
    const accessToken = jwt.sign(payload, config.JWT.key, {
      expiresIn: config.JWT.expires,
    });
    const refreshToken = await generateRefreshToken(user._id);

    return { status: 201, data: { accessToken, refreshToken, user } };
  } catch (error) {
    console.error("Auth register error:", error);
    return { status: 500, error: "Server error" };
  }
};

/**
 * Authenticate a user, verify password and issue tokens.
 * Devuelve: { accessToken, refreshToken, user }
 */
exports.login = async (email, password) => {
  try {
    const userRes = await userService.findByEmail(email, true);
    if (!userRes || userRes.status !== 200) {
      return { status: 400, error: "Invalid credentials" };
    }
    const userRaw = userRes.data;

    const isMatch = await comparePassword(password, userRaw.password);
    if (!isMatch) {
      return { status: 400, error: "Invalid credentials" };
    }

    // Recarga el usuario con populate (sin password)
    const fullUserRes = await userService.findById(
      userRaw._id,
      userPopulate,
      "-password"
    );
    if (!fullUserRes || fullUserRes.status !== 200) {
      return { status: 404, error: "User not found" };
    }
    const user = fullUserRes.data;

    const roleName = user.role?.name || null;
    const payload = { userId: user._id, role: roleName };
    const accessToken = jwt.sign(payload, config.JWT.key, {
      expiresIn: config.JWT.expires,
    });
    const refreshToken = await generateRefreshToken(user._id);

    return { status: 200, data: { accessToken, refreshToken, user } };
  } catch (error) {
    console.error("Auth login error:", error);
    return { status: 500, error: "Server error" };
  }
};

/**
 * Rotate a refresh token:
 * Devuelve: { accessToken, refreshToken, user }
 */
exports.refreshToken = async (refreshToken) => {
  try {
    if (!refreshToken) return { status: 400, error: "Refresh token required" };

    const decoded = jwt.verify(refreshToken, config.REFRESH_JWT.refreshKey);
    const { jti, userId } = decoded;
    if (!jti || !userId) {
      return { status: 401, error: "Invalid refresh token payload" };
    }

    const stored = await RefreshToken.findOne({ jti, userId });
    if (
      !stored ||
      stored.revokedAt ||
      (stored.expiresAt && stored.expiresAt <= new Date())
    ) {
      return { status: 401, error: "Invalid or expired refresh token" };
    }

    // Revoke current refresh token
    stored.revokedAt = new Date();
    await stored.save();

    // Load user populated
    const fullUserRes = await userService.findById(
      userId,
      userPopulate,
      "-password"
    );
    if (!fullUserRes || fullUserRes.status !== 200) {
      return { status: 404, error: "User not found" };
    }
    const user = fullUserRes.data;

    // Issue new pair
    const payload = {
      userId: user._id,
      role: user.role?.name || null,
    };
    const newAccessToken = jwt.sign(payload, config.JWT.key, {
      expiresIn: config.JWT.expires,
    });
    const newRefreshToken = await generateRefreshToken(user._id);

    return {
      status: 200,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken, user },
    };
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return { status: 401, error: "Invalid refresh token" };
    }
    console.error("Refresh token error:", err);
    return { status: 500, error: "Server error" };
  }
};

/**
 * Get user by ID (used by 'me' query).
 */
exports.getUser = async (userId) => {
  try {
    const user = await userService.findById(userId, userPopulate, "-password");
    if (!user || user.status !== 200) {
      return { status: 404, error: "User not found" };
    }
    return { status: 200, data: user.data };
  } catch (error) {
    return { status: 500, error: "Server error" };
  }
};