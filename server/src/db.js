/* global process */
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || "./server/data/app.db";
const absolute = path.resolve(dbPath);
fs.mkdirSync(path.dirname(absolute), { recursive: true });

export const db = new Database(absolute);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      quote_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      payload_json TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS rates (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      item_key TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(category, item_key),
      FOREIGN KEY(updated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      original_name TEXT NOT NULL,
      storage_name TEXT NOT NULL,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      contact_person TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      country TEXT DEFAULT 'India',
      gst_number TEXT DEFAULT '',
      pan_number TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'active',
      notes TEXT DEFAULT '',
      total_orders INTEGER DEFAULT 0,
      total_revenue REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      job_number TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      customer_id TEXT,
      customer_name TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      quantities TEXT DEFAULT '[]',
      paper_type TEXT DEFAULT '',
      binding_type TEXT DEFAULT '',
      total_value REAL DEFAULT 0,
      currency TEXT DEFAULT 'INR',
      priority TEXT DEFAULT 'medium',
      notes TEXT DEFAULT '',
      payload_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT DEFAULT '',
      category TEXT DEFAULT 'other',
      unit TEXT DEFAULT 'Pieces',
      stock REAL DEFAULT 0,
      min_level REAL DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      supplier TEXT DEFAULT '',
      last_updated TEXT NOT NULL
    );
  `);

  db.prepare(
    `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    "system-local",
    "Local System",
    "local-system@print-estimator",
    "!",
    "admin",
    new Date().toISOString()
  );
}
