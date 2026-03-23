import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const quoteStatusSchema = z.enum(["draft", "sent", "accepted", "rejected", "expired", "revised"]);

const quoteSchema = z.object({
  id: z.string().optional(),
  quoteNumber: z.string().min(1),
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().nullable(),
  payload: z.record(z.any()),
  totalAmount: z.number().nonnegative(),
  status: quoteStatusSchema.default("draft"),
});

// Map snake_case DB row to camelCase response
function enrichRow(r) {
  return {
    id: r.id,
    quoteNumber: r.quote_number,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    payload: JSON.parse(r.payload_json || "{}"),
    totalAmount: r.total_amount,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 500")
    .all();
  res.json({ quotes: rows.map(enrichRow) });
});

// Get single quote by ID
router.get("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM quotes WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Quote not found" });
  res.json({ quote: enrichRow(row) });
});

router.post("/", requireAuth, (req, res) => {
  const parsed = quoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const actorId = req.user?.sub || "system-local";
  const id = parsed.data.id || randomUUID();
  const now = new Date().toISOString();
  const q = parsed.data;

  db.prepare(
    `INSERT INTO quotes (id, quote_number, customer_name, customer_email, payload_json, total_amount, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    q.quoteNumber,
    q.customerName,
    q.customerEmail || null,
    JSON.stringify(q.payload),
    q.totalAmount,
    q.status,
    actorId,
    now,
    now
  );

  writeAudit(actorId, "quote.create", "quote", id, { quoteNumber: q.quoteNumber, totalAmount: q.totalAmount });

  res.status(201).json({ id, ...q, createdBy: actorId, createdAt: now, updatedAt: now });
});

router.patch("/:id/status", requireAuth, (req, res) => {
  const actorId = req.user?.sub || "system-local";
  const status = quoteStatusSchema.safeParse(req.body?.status);
  if (!status.success) return res.status(400).json({ error: "Invalid status" });

  const now = new Date().toISOString();
  const result = db
    .prepare("UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?")
    .run(status.data, now, req.params.id);

  if (!result.changes) return res.status(404).json({ error: "Quote not found" });

  writeAudit(actorId, "quote.status", "quote", req.params.id, { status: status.data });

  res.json({ id: req.params.id, status: status.data, updatedAt: now });
});

// ── Full update ────────────────────────────────────────────────────────────────
router.put("/:id", requireAuth, (req, res) => {
  const actorId = req.user?.sub || "system-local";
  const now = new Date().toISOString();
  const { customerName, customerEmail, payload, totalAmount, status, quoteNumber } = req.body;

  const result = db
    .prepare(
      `UPDATE quotes SET
         customer_name  = COALESCE(?, customer_name),
         customer_email = COALESCE(?, customer_email),
         payload_json   = COALESCE(?, payload_json),
         total_amount   = COALESCE(?, total_amount),
         status         = COALESCE(?, status),
         quote_number   = COALESCE(?, quote_number),
         updated_at     = ?
       WHERE id = ?`
    )
    .run(
      customerName ?? null,
      customerEmail ?? null,
      payload ? JSON.stringify(payload) : null,
      totalAmount ?? null,
      status ?? null,
      quoteNumber ?? null,
      now,
      req.params.id
    );

  if (!result.changes) return res.status(404).json({ error: "Quote not found" });

  writeAudit(actorId, "quote.update", "quote", req.params.id, { updated: Object.keys(req.body) });

  res.json({ id: req.params.id, updatedAt: now });
});

// ── Delete ─────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAuth, (req, res) => {
  const actorId = req.user?.sub || "system-local";
  const result = db.prepare("DELETE FROM quotes WHERE id = ?").run(req.params.id);

  if (!result.changes) return res.status(404).json({ error: "Quote not found" });

  writeAudit(actorId, "quote.delete", "quote", req.params.id, {});

  res.json({ ok: true });
});

export default router;
