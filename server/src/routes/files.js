import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { writeAudit } from "../services/audit.js";

const router = Router();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "./server/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO files (id, owner_id, original_name, storage_name, mime_type, size_bytes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.user.sub, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, now);

  writeAudit(req.user.sub, "file.upload", "file", id, { name: req.file.originalname, bytes: req.file.size });

  res.status(201).json({ id, originalName: req.file.originalname, sizeBytes: req.file.size, createdAt: now });
});

router.get("/", requireAuth, (req, res) => {
  const files = db
    .prepare("SELECT id, original_name, size_bytes, created_at FROM files WHERE owner_id = ? ORDER BY created_at DESC")
    .all(req.user.sub);
  res.json({ files });
});

export default router;
