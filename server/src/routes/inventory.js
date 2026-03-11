import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();

const itemSchema = z.object({
    name: z.string().min(1),
    sku: z.string().optional().default(""),
    category: z.enum(["paper", "plates", "finishing", "packing", "ink", "other"]).default("other"),
    unit: z.string().optional().default("Pieces"),
    stock: z.number().optional().default(0),
    minLevel: z.number().optional().default(0),
    costPerUnit: z.number().optional().default(0),
    supplier: z.string().optional().default(""),
});

// List
router.get("/", requireAuth, (_req, res) => {
    const rows = db.prepare("SELECT * FROM inventory ORDER BY name").all();
    res.json({ items: rows });
});

// Create
router.post("/", requireAuth, (req, res) => {
    const parsed = itemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const id = randomUUID();
    const now = new Date().toISOString();
    const d = parsed.data;

    db.prepare(
        `INSERT INTO inventory (id, name, sku, category, unit, stock, min_level, cost_per_unit, supplier, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, d.name, d.sku, d.category, d.unit, d.stock, d.minLevel, d.costPerUnit, d.supplier, now);

    writeAudit(req.user.sub, "inventory.create", "inventory", id, { name: d.name });
    res.status(201).json({ id, ...d, last_updated: now });
});

// Update
router.put("/:id", requireAuth, (req, res) => {
    const parsed = itemSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const now = new Date().toISOString();
    const d = parsed.data;
    const sets = [];
    const vals = [];

    if (d.name !== undefined) { sets.push("name = ?"); vals.push(d.name); }
    if (d.sku !== undefined) { sets.push("sku = ?"); vals.push(d.sku); }
    if (d.category !== undefined) { sets.push("category = ?"); vals.push(d.category); }
    if (d.unit !== undefined) { sets.push("unit = ?"); vals.push(d.unit); }
    if (d.stock !== undefined) { sets.push("stock = ?"); vals.push(d.stock); }
    if (d.minLevel !== undefined) { sets.push("min_level = ?"); vals.push(d.minLevel); }
    if (d.costPerUnit !== undefined) { sets.push("cost_per_unit = ?"); vals.push(d.costPerUnit); }
    if (d.supplier !== undefined) { sets.push("supplier = ?"); vals.push(d.supplier); }

    if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });

    sets.push("last_updated = ?");
    vals.push(now, req.params.id);

    const result = db.prepare(`UPDATE inventory SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
    if (!result.changes) return res.status(404).json({ error: "Item not found" });

    writeAudit(req.user.sub, "inventory.update", "inventory", req.params.id, d);
    res.json({ id: req.params.id, ...d, last_updated: now });
});

// Delete
router.delete("/:id", requireAuth, (req, res) => {
    const result = db.prepare("DELETE FROM inventory WHERE id = ?").run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: "Item not found" });
    writeAudit(req.user.sub, "inventory.delete", "inventory", req.params.id, {});
    res.json({ ok: true });
});

// Export CSV
router.get("/export/csv", requireAuth, (_req, res) => {
    const rows = db.prepare("SELECT * FROM inventory ORDER BY name").all();
    const header = "SKU,Name,Category,Stock,Min Level,Unit,Cost/Unit,Supplier";
    const csv = [header, ...rows.map(r =>
        [r.sku, r.name, r.category, r.stock, r.min_level, r.unit, r.cost_per_unit, r.supplier]
            .map(v => `"${String(v || "").replace(/"/g, '""')}"`)
            .join(",")
    )].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="inventory.csv"');
    res.send(csv);
});

// Import CSV
router.post("/import/csv", requireAuth, (req, res) => {
    const { rows } = req.body;
    if (!Array.isArray(rows)) return res.status(400).json({ error: "Expected rows array" });

    const insert = db.prepare(
        `INSERT INTO inventory (id, name, sku, category, unit, stock, min_level, cost_per_unit, supplier, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = new Date().toISOString();
    let imported = 0;
    const tx = db.transaction(() => {
        for (const r of rows) {
            if (!r.name) continue;
            const id = randomUUID();
            insert.run(id, r.name, r.sku || "", r.category || "other", r.unit || "Pieces", Number(r.stock) || 0, Number(r.minLevel) || 0, Number(r.costPerUnit) || 0, r.supplier || "", now);
            imported++;
        }
    });
    tx();
    writeAudit(req.user.sub, "inventory.import", "inventory", null, { count: imported });
    res.json({ ok: true, imported });
});

export default router;
