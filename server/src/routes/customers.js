import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const customerStatusSchema = z.enum(["active", "inactive", "draft", "lead"]);

const customerSchema = z.object({
    id: z.string().optional(),
    code: z.string().optional(),
    name: z.string().min(1),
    contactPerson: z.string().default(""),
    email: z.string().default(""),
    phone: z.string().default(""),
    address: z.string().default(""),
    city: z.string().default(""),
    state: z.string().default(""),
    country: z.string().default("India"),
    gstNumber: z.string().default(""),
    panNumber: z.string().default(""),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    status: customerStatusSchema.default("active"),
    notes: z.string().default(""),
});

function genCode(name) {
    const prefix = name.replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${rand}`;
}

// List all customers
router.get("/", requireAuth, (_req, res) => {
    const rows = db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
    res.json({ customers: rows });
});

// Get single customer
router.get("/:id", requireAuth, (req, res) => {
    const row = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Customer not found" });
    res.json({ customer: row });
});

// Create customer
router.post("/", requireAuth, (req, res) => {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const d = parsed.data;
    const id = d.id || randomUUID();
    const now = new Date().toISOString();
    const code = d.code || genCode(d.name);

    db.prepare(
        `INSERT INTO customers (id, code, name, contact_person, email, phone, address, city, state, country, gst_number, pan_number, priority, status, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, code, d.name, d.contactPerson, d.email, d.phone, d.address, d.city, d.state, d.country, d.gstNumber, d.panNumber, d.priority, d.status, d.notes, now, now);

    writeAudit(req.user.sub, "customer.create", "customer", id, { name: d.name, code });
    res.status(201).json({ id, code, ...d, created_at: now, updated_at: now });
});

// Update customer
router.put("/:id", requireAuth, (req, res) => {
    const parsed = customerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const now = new Date().toISOString();
    const d = parsed.data;
    const sets = [];
    const vals = [];

    if (d.name !== undefined) { sets.push("name = ?"); vals.push(d.name); }
    if (d.contactPerson !== undefined) { sets.push("contact_person = ?"); vals.push(d.contactPerson); }
    if (d.email !== undefined) { sets.push("email = ?"); vals.push(d.email); }
    if (d.phone !== undefined) { sets.push("phone = ?"); vals.push(d.phone); }
    if (d.address !== undefined) { sets.push("address = ?"); vals.push(d.address); }
    if (d.city !== undefined) { sets.push("city = ?"); vals.push(d.city); }
    if (d.state !== undefined) { sets.push("state = ?"); vals.push(d.state); }
    if (d.country !== undefined) { sets.push("country = ?"); vals.push(d.country); }
    if (d.gstNumber !== undefined) { sets.push("gst_number = ?"); vals.push(d.gstNumber); }
    if (d.panNumber !== undefined) { sets.push("pan_number = ?"); vals.push(d.panNumber); }
    if (d.priority !== undefined) { sets.push("priority = ?"); vals.push(d.priority); }
    if (d.status !== undefined) { sets.push("status = ?"); vals.push(d.status); }
    if (d.notes !== undefined) { sets.push("notes = ?"); vals.push(d.notes); }

    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

    sets.push("updated_at = ?");
    vals.push(now, req.params.id);

    const result = db.prepare(`UPDATE customers SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    if (!result.changes) return res.status(404).json({ error: "Customer not found" });

    writeAudit(req.user.sub, "customer.update", "customer", req.params.id, d);
    res.json({ id: req.params.id, ...d, updated_at: now });
});

// Delete customer
router.delete("/:id", requireAuth, (req, res) => {
    const result = db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Customer not found" });
    writeAudit(req.user.sub, "customer.delete", "customer", req.params.id, {});
    res.json({ ok: true });
});

// Export CSV
router.get("/export/csv", requireAuth, (_req, res) => {
    const rows = db.prepare("SELECT * FROM customers ORDER BY name").all();
    const header = "Code,Name,Contact Person,Email,Phone,City,Country,Priority,GST Number,Status";
    const csv = [header, ...rows.map(r =>
        [r.code, r.name, r.contact_person, r.email, r.phone, r.city, r.country, r.priority, r.gst_number, r.status]
            .map(v => `"${(v || "").replace(/"/g, '""')}"`)
            .join(",")
    )].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="customers.csv"');
    res.send(csv);
});

// Import CSV
router.post("/import/csv", requireAuth, (req, res) => {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected rows array" });

    const insert = db.prepare(
        `INSERT OR IGNORE INTO customers (id, code, name, contact_person, email, phone, city, country, priority, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = new Date().toISOString();
    let imported = 0;
    const tx = db.transaction(() => {
        for (const r of rows) {
            if (!r.name) continue;
            const id = randomUUID();
            const code = r.code || genCode(r.name);
            const status = customerStatusSchema.safeParse(r.status).success ? r.status : "active";
            insert.run(id, code, r.name, r.contactPerson || "", r.email || "", r.phone || "", r.city || "", r.country || "India", r.priority || "medium", status, now, now);
            imported++;
        }
    });
    tx();
    writeAudit(req.user.sub, "customer.import", "customer", null, { count: imported });
    res.json({ ok: true, imported });
});

export default router;
