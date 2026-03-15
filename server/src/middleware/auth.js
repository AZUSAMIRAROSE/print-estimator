import { verifyToken } from "../services/jwt.js";

function isAnonymousApiAllowed() {
  const explicit = process.env.ALLOW_ANONYMOUS_API;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  // Only allow in development, and even then with restricted role
  return process.env.NODE_ENV !== "production";
}

function getAnonymousUser() {
  return {
    sub: "system-local",
    role: "viewer",          // SECURITY FIX: was "admin" — now read-only
    email: "local-system@print-estimator",
    name: "Local System",
    anonymous: true,
  };
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    if (isAnonymousApiAllowed()) {
      req.user = getAnonymousUser();
      return next();
    }
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    // Reject refresh tokens used as access tokens
    if (decoded.type === "refresh") {
      return res.status(401).json({ error: "Access token required. Use /auth/refresh for token renewal." });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

/**
 * Middleware that allows both anonymous AND authenticated users,
 * but annotates whether the user is anonymous for downstream handlers.
 */
export function optionalAuth(req, _res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.type !== "refresh") {
        req.user = decoded;
      }
    } catch {
      // Token invalid — proceed as anonymous
    }
  }

  if (!req.user && isAnonymousApiAllowed()) {
    req.user = getAnonymousUser();
  }

  next();
}
