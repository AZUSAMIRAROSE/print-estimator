import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

function normalizeQuantities(value) {
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "string" && value.trim()) return value;
    return "[]";
}

const jobSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    customerId: z.string().optional().default(""),
    customerName: z.string().optional().default(""),
    status: z.enum(["draft", "estimated", "quoted", "in_production", "completed", "cancelled"]).default("draft"),
    quantities: z.union([z.string(), z.array(z.number())]).optional().default("[]"),
    paperType: z.string().optional().default(""),
    bindingType: z.string().optional().default(""),
    totalValue: z.number().optional().default(0),
    currency: z.string().optional().default("INR"),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    notes: z.string().optional().default(""),
    payload: z.record(z.any()).optional(),
});

function genJobNumber() {
    const now = new Date();
    const yr = now.getFullYear().toString().slice(-2);
    const mo = (now.getMonth() + 1).toString().padStart(2, "0");
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `JOB-${yr}${mo}-${rand}`;
}

// List
router.get("/", requireAuth, (_req, res) => {
    const rows = db.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 500").all()
        .map(r => ({ ...r, payload: JSON.parse(r.payload_json || "{}"), quantities: JSON.parse(r.quantities || "[]") }));
    res.json({ jobs: rows });
});

// Get single
router.get("/:id", requireAuth, (req, res) => {
    const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Job not found" });
    res.json({ job: { ...row, payload: JSON.parse(row.payload_json || "{}"), quantities: JSON.parse(row.quantities || "[]") } });
});

// Create
router.post("/", requireAuth, (req, res) => {
    const parsed = jobSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const actorId = req.user?.sub || "system-local";
    const d = parsed.data;
    const id = d.id || randomUUID();
    const now = new Date().toISOString();
    const jobNumber = genJobNumber();

    db.prepare(
        `INSERT INTO jobs (id, job_number, title, customer_id, customer_name, status, quantities, paper_type, binding_type, total_value, currency, priority, notes, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, jobNumber, d.title, d.customerId, d.customerName, d.status, normalizeQuantities(d.quantities), d.paperType, d.bindingType, d.totalValue, d.currency, d.priority, d.notes, JSON.stringify(d.payload || {}), now, now);

    writeAudit(actorId, "job.create", "job", id, { title: d.title, jobNumber });
    res.status(201).json({ id, jobNumber, ...d, created_at: now, updated_at: now });
});

// Update
router.put("/:id", requireAuth, (req, res) => {
    const parsed = jobSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const now = new Date().toISOString();
    const d = parsed.data;
    const sets = [];
    const vals = [];

    if (d.title !== undefined) { sets.push("title = ?"); vals.push(d.title); }
    if (d.customerName !== undefined) { sets.push("customer_name = ?"); vals.push(d.customerName); }
    if (d.customerId !== undefined) { sets.push("customer_id = ?"); vals.push(d.customerId); }
    if (d.status !== undefined) { sets.push("status = ?"); vals.push(d.status); }
    if (d.quantities !== undefined) { sets.push("quantities = ?"); vals.push(normalizeQuantities(d.quantities)); }
    if (d.paperType !== undefined) { sets.push("paper_type = ?"); vals.push(d.paperType); }
    if (d.bindingType !== undefined) { sets.push("binding_type = ?"); vals.push(d.bindingType); }
    if (d.totalValue !== undefined) { sets.push("total_value = ?"); vals.push(d.totalValue); }
    if (d.currency !== undefined) { sets.push("currency = ?"); vals.push(d.currency); }
    if (d.priority !== undefined) { sets.push("priority = ?"); vals.push(d.priority); }
    if (d.notes !== undefined) { sets.push("notes = ?"); vals.push(d.notes); }
    if (d.payload !== undefined) { sets.push("payload_json = ?"); vals.push(JSON.stringify(d.payload)); }

    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

    sets.push("updated_at = ?");
    vals.push(now, req.params.id);

    const result = db.prepare(`UPDATE jobs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    if (!result.changes) return res.status(404).json({ error: "Job not found" });

    writeAudit(req.user?.sub || "system-local", "job.update", "job", req.params.id, d);
    res.json({ id: req.params.id, ...d, updated_at: now });
});

// Delete
router.delete("/:id", requireAuth, (req, res) => {
    const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Job not found" });
    writeAudit(req.user?.sub || "system-local", "job.delete", "job", req.params.id, {});
    res.json({ ok: true });
});

// Duplicate
router.post("/:id/duplicate", requireAuth, (req, res) => {
    const original = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
    if (!original) return res.status(404).json({ error: "Job not found" });

    const id = randomUUID();
    const now = new Date().toISOString();
    const jobNumber = genJobNumber();

    db.prepare(
        `INSERT INTO jobs (id, job_number, title, customer_id, customer_name, status, quantities, paper_type, binding_type, total_value, currency, priority, notes, payload_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, jobNumber, `${original.title} (Copy)`, original.customer_id, original.customer_name, original.quantities, original.paper_type, original.binding_type, original.total_value, original.currency, original.priority, original.notes, original.payload_json, now, now);

    writeAudit(req.user?.sub || "system-local", "job.duplicate", "job", id, { originalId: req.params.id });
    res.status(201).json({ id, jobNumber, title: `${original.title} (Copy)`, created_at: now });
});

export default router;
