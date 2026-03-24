const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function initDb() {
  await db.execute(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT DEFAULT 'other',
    size TEXT,
    condition TEXT DEFAULT 'good',
    purchase_price REAL NOT NULL DEFAULT 0,
    selling_price REAL,
    status TEXT DEFAULT 'available',
    purchase_date TEXT,
    notes TEXT,
    image_url TEXT,
    submitted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    item_id TEXT,
    selling_price REAL NOT NULL,
    sale_date TEXT NOT NULL,
    buyer_name TEXT,
    buyer_contact TEXT,
    platform TEXT DEFAULT 'Instagram',
    notes TEXT,
    submitted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    notes TEXT,
    submitted_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.execute(`CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Safe migrations — silently ignored if column already exists
  const migrations = [
    'ALTER TABLE items ADD COLUMN submitted_by TEXT',
    'ALTER TABLE sales ADD COLUMN submitted_by TEXT',
    'ALTER TABLE expenses ADD COLUMN submitted_by TEXT',
    'ALTER TABLE items ADD COLUMN image_url TEXT',
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch {}
  }
}

// Run once at module load; every require() shares this promise
const ready = initDb().catch(console.error);

module.exports = { db, ready };
