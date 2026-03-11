import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", uptimeSec: Math.round(process.uptime()), ts: new Date().toISOString() });
});

router.get("/admin/audit-logs", requireAuth, requireRole("admin"), (_req, res) => {
  const logs = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000").all();
  res.json({ logs });
});

export default router;
