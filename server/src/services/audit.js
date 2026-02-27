import { randomUUID } from "node:crypto";
import { db } from "../db.js";

export function writeAudit(userId, action, entityType, entityId, details) {
  db.prepare(
    `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    userId || null,
    action,
    entityType,
    entityId || null,
    details ? JSON.stringify(details) : null,
    new Date().toISOString()
  );
}
