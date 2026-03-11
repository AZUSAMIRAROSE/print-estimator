import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "dev-secret";
const expiresIn = process.env.JWT_EXPIRES_IN || "8h";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    secret,
    { expiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}
