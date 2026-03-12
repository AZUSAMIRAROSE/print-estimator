import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

// Retrieve the entire rate card config
router.get("/", requireAuth, (req, res) => {
  const row = db.prepare("SELECT payload_json, updated_at FROM config_store WHERE config_key = 'rateCard'").get();
  
  if (!row) {
    return res.json({ rateCard: null });
  }

  res.json({ rateCard: JSON.parse(row.payload_json), updatedAt: row.updated_at });
});

// Update the entire rate card config with a JSON payload
router.put("/", requireAuth, requireRole("admin"), (req, res) => {
  const payloadStr = JSON.stringify(req.body);
  const now = new Date().toISOString();
  
  db.prepare(
    `INSERT INTO config_store (config_key, payload_json, updated_by, updated_at)
     VALUES ('rateCard', ?, ?, ?)
     ON CONFLICT(config_key)
     DO UPDATE SET payload_json = excluded.payload_json,
                   updated_by = excluded.updated_by,
                   updated_at = excluded.updated_at`
  ).run(payloadStr, req.user.sub, now);

  writeAudit(req.user.sub, "rateCard.upsert", "config", "rateCard", { keys: Object.keys(req.body) });

  res.json({ success: true, updatedAt: now });
});

export default router;
