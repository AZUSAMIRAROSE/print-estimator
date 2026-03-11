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

router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM quotes ORDER BY created_at DESC LIMIT 500")
    .all()
    .map((r) => ({ ...r, payload: JSON.parse(r.payload_json) }));
  res.json({ quotes: rows });
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

export default router;
