import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";

// ── Secret handling ──────────────────────────────────────────────────────────
// In production, JWT_SECRET MUST be set. In development, we auto-generate
// a unique per-session secret (never the insecure "dev-secret" fallback).
const isProd = process.env.NODE_ENV === "production";
const secret = process.env.JWT_SECRET || (isProd ? null : randomBytes(48).toString("hex"));

if (!secret) {
  console.error("[FATAL] JWT_SECRET environment variable is required in production.");
  process.exit(1);
}

const accessExpiresIn = process.env.JWT_EXPIRES_IN || "1h";
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Sign a short-lived access token (1h default)
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name, type: "access" },
    secret,
    { expiresIn: accessExpiresIn }
  );
}

/**
 * Sign a long-lived refresh token (7d default)
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, type: "refresh" },
    secret,
    { expiresIn: refreshExpiresIn }
  );
}

/**
 * Verify any token (access or refresh)
 */
export function verifyToken(token) {
  return jwt.verify(token, secret);
}
