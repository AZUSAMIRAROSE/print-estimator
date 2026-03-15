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
  // ── Core Tables ──────────────────────────────────────────────────────────
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
      payload_json TEXT DEFAULT '{}',
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
      due_date TEXT DEFAULT '',
      payload_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      machine_type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      manufacturer TEXT DEFAULT '',
      model TEXT DEFAULT '',
      installation_date TEXT DEFAULT '',
      base_hourly_rate REAL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS config_store (
      config_key TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // ── Migration: Add payload_json to customers if missing ──────────────────
  const customerCols = db.prepare("PRAGMA table_info(customers)").all().map(c => c.name);
  if (!customerCols.includes("payload_json")) {
    db.exec("ALTER TABLE customers ADD COLUMN payload_json TEXT DEFAULT '{}'");
  }

  // ── Migration: Add due_date to jobs if missing ───────────────────────────
  const jobCols = db.prepare("PRAGMA table_info(jobs)").all().map(c => c.name);
  if (!jobCols.includes("due_date")) {
    db.exec("ALTER TABLE jobs ADD COLUMN due_date TEXT DEFAULT ''");
  }

  // ── Performance Indexes ──────────────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
    CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
    CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
    CREATE INDEX IF NOT EXISTS idx_machines_status ON machines(status);
  `);

  // ── Seed system user ─────────────────────────────────────────────────────
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
