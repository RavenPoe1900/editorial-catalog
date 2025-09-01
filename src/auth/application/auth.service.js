const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../_shared/config/config");
const userService = require("../../modules/users/application/user.service");
const RoleService = require("../../modules/roles/application/role.service");
const RoleTypeEnum = require("../../_shared/enum/roles.enum");
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
 * Register a new user with EMPLOYEE role and issue tokens.
 */
exports.register = async (email, password) => {
  try {
    const existing = await userService.findByEmail(email);
    if (existing && existing.status === 200) {
      return { status: 400, error: "User already exists" };
    }

    const hash = await hashPassword(password);
    const roleRes = await RoleService.findOneByCriteria({
      name: RoleTypeEnum.EMPLOYEE,
    });

    if (!roleRes || roleRes.status !== 200) {
      return { status: 500, error: "Server error" };
    }

    const userRes = await userService.create({
      email,
      password: hash,
      role: roleRes.data._id,
    });
    if (!userRes || userRes.status !== 201) {
      return { status: 500, error: "Could not create user" };
    }

    const payload = { userId: userRes.data._id, role: RoleTypeEnum.EMPLOYEE };
    const accessToken = jwt.sign(payload, config.JWT.key, {
      expiresIn: config.JWT.expires,
    });
    const refreshToken = await generateRefreshToken(userRes.data._id);

    return { status: 201, data: { accessToken, refreshToken } };
  } catch (error) {
    console.error("Auth register error:", error);
    return { status: 500, error: "Server error" };
  }
};

/**
 * Authenticate a user, verify password and issue tokens.
 */
exports.login = async (email, password) => {
  try {
    const userRes = await userService.findByEmail(email, true);
    if (!userRes || userRes.status !== 200) {
      return { status: 400, error: "Invalid credentials" };
    }
    const user = userRes.data;
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return { status: 400, error: "Invalid credentials" };
    }

    // Include role in the access token payload
    const fullUserRes = await userService.findById(
      user._id,
      userPopulate,
      "-password"
    );
    const roleName = fullUserRes?.data?.role?.name || null;

    const payload = { userId: user._id, role: roleName };
    const accessToken = jwt.sign(payload, config.JWT.key, {
      expiresIn: config.JWT.expires,
    });
    const refreshToken = await generateRefreshToken(user._id);

    return { status: 200, data: { accessToken, refreshToken } };
  } catch (error) {
    console.error("Auth login error:", error);
    return { status: 500, error: "Server error" };
  }
};

/**
 * Rotate a refresh token:
 * - Verify signature and extract { jti, userId }.
 * - Ensure token record exists and is not revoked/expired.
 * - Revoke current token and issue a new pair (access + refresh).
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

    const payload = {
      userId: fullUserRes.data._id,
      role: fullUserRes.data?.role?.name || null,
    };
    const newAccessToken = jwt.sign(payload, config.JWT.key, {
      expiresIn: config.JWT.expires,
    });
    const newRefreshToken = await generateRefreshToken(fullUserRes.data._id);

    return {
      status: 200,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
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
 * Get user by ID (used by me query).
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