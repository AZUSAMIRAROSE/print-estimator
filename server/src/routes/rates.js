import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const rateSchema = z.object({
  category: z.string().min(1),
  itemKey: z.string().min(1),
  value: z.number(),
  unit: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

router.get("/", requireAuth, (req, res) => {
  const rates = db.prepare("SELECT * FROM rates ORDER BY category, item_key").all();
  res.json({ rates });
});

router.put("/", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = rateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const now = new Date().toISOString();
  const { category, itemKey, value, unit, isActive } = parsed.data;
  const id = randomUUID();

  db.prepare(
    `INSERT INTO rates (id, category, item_key, value, unit, is_active, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(category, item_key)
     DO UPDATE SET value = excluded.value,
                   unit = excluded.unit,
                   is_active = excluded.is_active,
                   updated_by = excluded.updated_by,
                   updated_at = excluded.updated_at`
  ).run(id, category, itemKey, value, unit || null, isActive ? 1 : 0, req.user.sub, now);

  writeAudit(req.user.sub, "rate.upsert", "rate", `${category}:${itemKey}`, { value, unit, isActive });

  res.json({ category, itemKey, value, unit, isActive, updatedAt: now });
});

export default router;
