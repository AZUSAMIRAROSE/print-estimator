import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { signToken, signRefreshToken, verifyToken } from "../services/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password } = parsed.data;
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const hash = await bcrypt.hash(password, 12);
  const id = randomUUID();
  const now = new Date().toISOString();

  const isFirstUser = !db.prepare("SELECT id FROM users WHERE id != 'system-local' LIMIT 1").get();
  const role = isFirstUser ? "admin" : "user";

  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, name, email, hash, role, now);

  writeAudit(id, "auth.register", "user", id, { email, role });

  const token = signToken({ id, name, email, role });
  const refreshToken = signRefreshToken({ id, role });
  res.status(201).json({ token, refreshToken, user: { id, name, email, role } });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  writeAudit(user.id, "auth.login", "user", user.id, { email });

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  const refreshToken = signRefreshToken({ id: user.id, role: user.role });
  res.json({ token, refreshToken, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// ── Refresh Token ──────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken is required" });

  try {
    const decoded = verifyToken(refreshToken);
    if (decoded.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type — send a refresh token" });
    }

    // Lookup user to get latest info
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(decoded.sub);
    if (!user) return res.status(401).json({ error: "User not found" });

    const newToken = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ id: user.id, role: user.role });

    writeAudit(user.id, "auth.refresh", "user", user.id, {});
    res.json({ token: newToken, refreshToken: newRefreshToken, user });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?")
    .get(req.user.sub);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

export default router;
