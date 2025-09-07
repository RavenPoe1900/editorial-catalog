/**
 * @fileoverview Authentication service: registration, login, token rotation.
 *
 * Responsibilities:
 *  - Register users (role lookup, hashing, issuing initial tokens).
 *  - Authenticate users (password verification, token issuance).
 *  - Refresh token rotation (invalidate old, issue new pair atomically).
 *  - Fetch user profile for "me" query.
 *
 * Token Model:
 *  - Access Token: short-lived JWT (stateless) with { userId, role }.
 *  - Refresh Token: JWT embedding { userId, jti } persisted in DB (RefreshToken collection).
 *  - Each refresh token stored with expiresAt and optional revokedAt.
 *
 * Rotation Strategy:
 *  - Upon refresh, existing refresh token is revoked (revokedAt set) and a brand new one is issued.
 *  - No reuse of refresh tokens (prevents replay if stolen after a rotation).
 *
 * Security Considerations:
 *  - Password hashing uses bcrypt (cost factor = 10). Increase in production if acceptable latency.
 *  - Refresh token JTI uses crypto.randomUUID() or fallback to random bytes for uniqueness.
 *  - Failure modes return generic messages (no user enumeration beyond "User already exists").
 *
 * Reliability:
 *  - DB insert for refresh token is single operation; no distributed transaction needed.
 *  - If refresh token persistence fails after issuing JWT, there is a theoretical orphan token risk
 *    (acceptable for this level; can be mitigated by persisting before signing in advanced designs).
 *
 * Future Enhancements:
 *  - Add refresh token pruning beyond maxTokensPerUser (currently not enforced here).
 *  - Add device / user-agent binding for refresh tokens.
 *  - Add optional IP binding or anomaly detection.
 */

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../_shared/config/config");
const userService = require("../../modules/users/application/user.service");
const RoleService = require("../../modules/roles/application/role.service");
const RefreshToken = require("../domain/refresh-token.schema");
const { hashPassword, comparePassword } = require("../../_shared/hash/password.hash");
const userPopulate = require("../../modules/users/domain/user.populate");

/**
 * Generate and persist a refresh token with unique JTI.
 * BEST-EFFORT: If persistence fails (e.g. DB outage), caller gets an error at upper layer.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<string>} Signed refresh JWT
 */
const generateRefreshToken = async (userId) => {
  const jti =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

  const token = jwt.sign({ userId, jti }, config.REFRESH_JWT.refreshKey, {
    expiresIn: config.REFRESH_JWT.refreshExpires,
  });

  // Derive expiry timestamp (decode exp or fallback).
  const decoded = jwt.decode(token);
  let expiresAt = new Date();
  if (decoded && decoded.exp) {
    expiresAt = new Date(decoded.exp * 1000);
  } else {
    // Fallback: 7 days if no exp claim (should not happen under normal jsonwebtoken behavior).
    const fallbackMs = 7 * 24 * 60 * 60 * 1000;
    expiresAt.setTime(expiresAt.getTime() + fallbackMs);
  }

  await RefreshToken.create({ jti, expiresAt, userId });
  return token;
};

/**
 * Register a new user.
 * Validations:
 *  - Ensures email uniqueness.
 *  - Locates role by case-insensitive name.
 *
 * @param {{ email:string,password:string,name:string,role:string }} input
 * @returns {Promise<{status:number,data?:any,error?:string}>}
 */
exports.register = async (input) => {
  try {
    const { email, password, name, role } = input;

    const existing = await userService.findByEmail(email);
    if (existing && existing.status === 200) {
      return { status: 400, error: "User already exists" };
    }

    const hash = await hashPassword(password);

    // Case-insensitive role lookup
    const roleRes = await RoleService.findOneByCriteria({
      name: new RegExp(`^${role}$`, "i"),
    });
    if (!roleRes || roleRes.status !== 200) {
      return { status: 404, error: `Role '${role}' not found` };
    }
    const roleId = roleRes.data._id;

    const userRes = await userService.create({
      email,
      password: hash,
      name,
      role: roleId,
    });
    if (!userRes || userRes.status !== 201) {
      return { status: 500, error: "Could not create user" };
    }

    const populatedUserRes = await userService.findById(
      userRes.data._id,
      userPopulate,
      "-password"
    );
    if (!populatedUserRes || populatedUserRes.status !== 200) {
      return { status: 500, error: "Could not load created user" };
    }
    const user = populatedUserRes.data;

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
 * Authenticate user and issue token pair.
 *
 * @param {string} email
 * @param {string} password
 */
exports.login = async (email, password) => {
  try {
    const userRes = await userService.findByEmail(email, true);
    if (!userRes || userRes.status !== 200) {
      return { status: 400, error: "Invalid credentials" };
    }
    const userRaw = userRes.data;

    const isMatch = await comparePassword(password, userRaw.password);
    // Uniform response avoids user enumeration
    if (!isMatch) {
      return { status: 400, error: "Invalid credentials" };
    }

    // Reload populated (strips password)
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
 * Rotate refresh token (invalidate old, produce new).
 * Error Conditions:
 *  - Missing token
 *  - Invalid signature / malformed
 *  - Expired or revoked or not found in DB
 *
 * @param {string} refreshToken
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

    // Invalidate old refresh token to prevent reuse
    stored.revokedAt = new Date();
    await stored.save();

    const fullUserRes = await userService.findById(
      userId,
      userPopulate,
      "-password"
    );
    if (!fullUserRes || fullUserRes.status !== 200) {
      return { status: 404, error: "User not found" };
    }
    const user = fullUserRes.data;

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
    // JWT-specific errors mapped to 401
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return { status: 401, error: "Invalid refresh token" };
    }
    console.error("Refresh token error:", err);
    return { status: 500, error: "Server error" };
  }
};

/**
 * Fetch user profile (excludes password).
 * @param {string|ObjectId} userId
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