// Authentication service: register, login, refresh token flows.
// Changes:
// - Refresh tokens now use a `jti` (JWT ID) embedded in the token and stored in DB.
// - We store jti + expiresAt + revokedAt + userId in DB instead of storing hashed token.
// - generateRefreshToken signs a refresh JWT with jti and persists the jti and expiry.
// - refreshToken flow verifies JWT, finds the DB record by jti, checks revocation/expiry, revokes it and issues new tokens.

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../../_shared/config/config");
const userService = require("../../modules/users/application/user.service");
const RoleService = require("../../modules/roles/application/role.service");
const RoleTypeEnum = require("../../_shared/enum/roles.enum");
const RefreshToken = require("../domain/refresh-token.schema");
const {
  hashPassword,
  comparePassword,
} = require("../../_shared/hash/password.hash");

// Generate a refresh token:
// - create a unique jti
// - sign a JWT containing userId and jti
// - decode token to compute expiresAt (from exp claim) and persist { jti, expiresAt, userId }
const generateRefreshToken = async (userId) => {
  // Create a strong random jti. Use crypto.randomUUID if available, otherwise fallback.
  const jti =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : crypto.randomBytes(16).toString("hex");

  // Sign a refresh JWT including the jti
  const token = jwt.sign({ userId, jti }, config.REFRESH_JWT.refreshKey, {
    expiresIn: config.REFRESH_JWT.refreshExpires,
  });

  // Decode the token to get the exp claim (expiry in seconds since epoch)
  const decoded = jwt.decode(token);
  let expiresAt = new Date();
  if (decoded && decoded.exp) {
    // `exp` is in seconds, convert to ms
    expiresAt = new Date(decoded.exp * 1000);
  } else {
    // Fallback: if exp not present for some reason, set expiresAt to now + configured duration (best effort).
    // Note: This branch should not normally run because jwt.sign with expiresIn sets exp.
    const fallbackMs = 7 * 24 * 60 * 60 * 1000; // fallback to 7 days
    expiresAt.setTime(expiresAt.getTime() + fallbackMs);
  }

  // Persist the jti with expiry and owner userId
  await RefreshToken.create({
    jti,
    expiresAt,
    userId,
  });

  // Return the raw refresh token to the client
  return token;
};

exports.register = async (email, password) => {
  try {
    const existing = await userService.findByEmail(email);
    if (existing && existing.status === 200) {
      return { status: 400, error: "User already exists" };
    }

    const hash = await hashPassword(password);
    const roleRes = await RoleService.findOneByCriteria({ name: RoleTypeEnum.EMPLOYEE });

    if (!roleRes || roleRes.status !== 200) {
      console.error('Ensuring "EMPLOYEE" role exist');
      return { status: 500, error: "Server error" };
    }

    const userRes = await userService.create({ email, password: hash, role: roleRes.data._id });
    if (!userRes || userRes.status !== 201) {
      return { status: 500, error: "Could not create user" };
    }

    const payload = { userId: userRes.data._id };
    const accessToken = jwt.sign(payload, config.JWT.key, { expiresIn: config.JWT.expires });
    const refreshToken = await generateRefreshToken(userRes.data._id);

    return { status: 201, data: { accessToken, refreshToken } };
  } catch (error) {
    console.error("Auth register error:", error);
    return { status: 500, error: "Server error" };
  }
};

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

    const payload = { userId: user._id };
    const accessToken = jwt.sign(payload, config.JWT.key, { expiresIn: config.JWT.expires });
    const refreshToken = await generateRefreshToken(user._id);

    return { status: 200, data: { accessToken, refreshToken } };
  } catch (error) {
    console.error("Auth login error:", error);
    return { status: 500, error: "Server error" };
  }
};
// Refresh tokens flow:
// - verify the provided refresh token signature and get the jti/userId
// - find the refresh token DB record by jti and userId
// - ensure it's not revoked and not expired
// - revoke the stored token (set revokedAt) and issue new access + refresh tokens
exports.refreshToken = async (refreshToken) => {
  try {
    if (!refreshToken) return { status: 400, error: "Refresh token required" };

    const decoded = jwt.verify(refreshToken, config.REFRESH_JWT.refreshKey);
    const { jti, userId } = decoded;
    if (!jti || !userId) {
      return { status: 401, error: "Invalid refresh token payload" };
    }

    const stored = await RefreshToken.findOne({ jti, userId });
    if (!stored || stored.revokedAt || (stored.expiresAt && stored.expiresAt <= new Date())) {
      return { status: 401, error: "Invalid or expired refresh token" };
    }

    // Revoke current token and rotate
    stored.revokedAt = new Date();
    await stored.save();

    const userRes = await userService.findById(userId);
    if (!userRes || userRes.status !== 200) {
      return { status: 404, error: "User not found" };
    }

    const payload = { userId: userRes.data._id };
    const newAccessToken = jwt.sign(payload, config.JWT.key, { expiresIn: config.JWT.expires });
    const newRefreshToken = await generateRefreshToken(userRes.data._id);

    return { status: 200, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
  } catch (err) {
    // Si es error de JWT (TokenExpiredError | JsonWebTokenError) -> 401
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return { status: 401, error: "Invalid refresh token" };
    }
    console.error("Refresh token error:", err);
    return { status: 500, error: "Server error" };
  }
};

exports.getUser = async (userId) => {
  try {
    const user = await userService.findById(userId);
    if (!user) {
      return { status: 404, error: "User not found" };
    }
    return { status: 200, user };
  } catch (error) {
    return { status: 500, error: "Server error" };
  }
};