const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'realwearatlas.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Core tables ──────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    brand          TEXT,
    category       TEXT NOT NULL DEFAULT 'other',
    purchase_price REAL NOT NULL,
    purchase_date  TEXT NOT NULL DEFAULT (date('now')),
    notes          TEXT,
    image_url      TEXT,
    status         TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','sold')),
    submitted_by   TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sales (
    id            TEXT PRIMARY KEY,
    item_id       TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    selling_price REAL NOT NULL,
    sale_date     TEXT NOT NULL,
    buyer_name    TEXT,
    buyer_contact TEXT,
    platform      TEXT DEFAULT 'Instagram',
    notes         TEXT,
    submitted_by  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id           TEXT PRIMARY KEY,
    amount       REAL NOT NULL,
    category     TEXT NOT NULL CHECK(category IN ('ads','shipping','packaging','misc')),
    expense_date TEXT NOT NULL,
    notes        TEXT,
    submitted_by TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id          TEXT PRIMARY KEY,
    user_name   TEXT NOT NULL,
    action      TEXT NOT NULL CHECK(action IN ('created','updated','deleted')),
    entity_type TEXT NOT NULL CHECK(entity_type IN ('item','sale','expense')),
    entity_id   TEXT NOT NULL,
    entity_name TEXT,
    details     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_items_status    ON items(status);
  CREATE INDEX IF NOT EXISTS idx_items_category  ON items(category);
  CREATE INDEX IF NOT EXISTS idx_sales_item_id   ON sales(item_id);
  CREATE INDEX IF NOT EXISTS idx_sales_date      ON sales(sale_date);
  CREATE INDEX IF NOT EXISTS idx_expenses_date   ON expenses(expense_date);
  CREATE INDEX IF NOT EXISTS idx_log_user        ON activity_log(user_name);
  CREATE INDEX IF NOT EXISTS idx_log_created     ON activity_log(created_at);
`);

// ── Safe migrations for existing databases ───────────────
function colExists(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
}
function addCol(table, col, def) {
  if (!colExists(table, col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}

addCol('items',    'submitted_by', 'TEXT');
addCol('sales',    'submitted_by', 'TEXT');
addCol('expenses', 'submitted_by', 'TEXT');

module.exports = db;
