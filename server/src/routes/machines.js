import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

// Base validation to ensure we have mandatory fields
const machineBaseSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  status: z.string().default("active"),
  manufacturer: z.string().optional().default(""),
  model: z.string().optional().default(""),
  installationDate: z.string().optional().default(""),
  finances: z.object({
    baseHourlyRate: z.number().optional().default(0),
  }).passthrough().optional().default({}),
}).passthrough(); // Allow all other payload properties

router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM machines ORDER BY created_at DESC LIMIT 500")
    .all()
    .map((r) => ({ ...JSON.parse(r.payload_json), id: r.id })); // Merge payload and id
  res.json({ machines: rows });
});

router.post("/", requireAuth, (req, res) => {
  const parsed = machineBaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actorId = req.user?.sub || "system-local";
  const id = parsed.data.id || randomUUID();
  const now = new Date().toISOString();
  const payload = { ...parsed.data, id }; // Ensure payload matches

  db.prepare(
    `INSERT INTO machines (id, name, machine_type, status, manufacturer, model, installation_date, base_hourly_rate, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parsed.data.name,
    parsed.data.type,
    parsed.data.status,
    parsed.data.manufacturer,
    parsed.data.model,
    parsed.data.installationDate,
    parsed.data.finances?.baseHourlyRate || 0,
    JSON.stringify(payload),
    now,
    now
  );

  writeAudit(actorId, "machine.create", "machine", id, { name: parsed.data.name, type: parsed.data.type });
  res.status(201).json({ ...payload, createdAt: now, updatedAt: now });
});

router.put("/:id", requireAuth, (req, res) => {
  const parsed = machineBaseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actorId = req.user?.sub || "system-local";
  const now = new Date().toISOString();
  const payload = { ...parsed.data, id: req.params.id };

  const result = db
    .prepare(
      `UPDATE machines SET
         name = ?,
         machine_type = ?,
         status = ?,
         manufacturer = ?,
         model = ?,
         installation_date = ?,
         base_hourly_rate = ?,
         payload_json = ?,
         updated_at = ?
       WHERE id = ?`
    )
    .run(
      parsed.data.name,
      parsed.data.type,
      parsed.data.status,
      parsed.data.manufacturer,
      parsed.data.model,
      parsed.data.installationDate,
      parsed.data.finances?.baseHourlyRate || 0,
      JSON.stringify(payload),
      now,
      req.params.id
    );

  if (!result.changes) return res.status(404).json({ error: "Machine not found" });

  writeAudit(actorId, "machine.update", "machine", req.params.id, { updated: Object.keys(req.body) });
  res.json({ id: req.params.id, updatedAt: now });
});

router.delete("/:id", requireAuth, (req, res) => {
  const actorId = req.user?.sub || "system-local";
  const result = db.prepare("DELETE FROM machines WHERE id = ?").run(req.params.id);

  if (!result.changes) return res.status(404).json({ error: "Machine not found" });

  writeAudit(actorId, "machine.delete", "machine", req.params.id, {});
  res.json({ ok: true });
});

router.post("/:id/duplicate", requireAuth, (req, res) => {
  const actorId = req.user?.sub || "system-local";
  const row = db.prepare("SELECT * FROM machines WHERE id = ?").get(req.params.id);
  
  if (!row) return res.status(404).json({ error: "Machine not found" });

  const newId = randomUUID();
  const now = new Date().toISOString();
  const payload = JSON.parse(row.payload_json);
  const newName = payload.name + " (Copy)";
  
  const newPayload = { ...payload, id: newId, name: newName };

  db.prepare(
    `INSERT INTO machines (id, name, machine_type, status, manufacturer, model, installation_date, base_hourly_rate, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId,
    newName,
    row.machine_type,
    "draft", // reset status or keep original? let's make drafts
    row.manufacturer,
    row.model,
    row.installation_date,
    row.base_hourly_rate,
    JSON.stringify(newPayload),
    now,
    now
  );

  writeAudit(actorId, "machine.duplicate", "machine", newId, { originalId: req.params.id });
  res.status(201).json({ ...newPayload, createdAt: now, updatedAt: now });
});

export default router;
