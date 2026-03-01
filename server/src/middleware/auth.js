import { verifyToken } from "../services/jwt.js";

function isAnonymousApiAllowed() {
  const explicit = process.env.ALLOW_ANONYMOUS_API;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function getAnonymousUser() {
  return {
    sub: "system-local",
    role: "admin",
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
    req.user = verifyToken(token);
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
