// D1 (SQLite) data layer.
export const MOBILE_RE = /^09\d{9}$/;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name  TEXT NOT NULL,
    mobile     TEXT NOT NULL UNIQUE CHECK (mobile GLOB '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
  `CREATE TABLE IF NOT EXISTS gold_assets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    gold_grams REAL NOT NULL DEFAULT 0 CHECK (gold_grams >= 0),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  )`,
];

export const SEED_USERS = [
  ['علی رضایی', '09121234567', 12.345],
  ['سارا احمدی', '09120000002', 150.0],
  ['رضا کریمی', '09120000003', 0.25],
  ['مریم حسینی', '09120000004', 0],
  ['نیما موسوی', '09120000005', 3.75],
];

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const round3 = (n) => Math.round(n * 1000) / 1000;

let schemaReady = null;
export function ensureSchema(db) {
  // Idempotent; runs once per isolate so no separate migration step is needed.
  schemaReady ??= db.batch(SCHEMA.map((s) => db.prepare(s))).catch((e) => {
    schemaReady = null;
    throw e;
  });
  return schemaReady;
}

const SELECT = `SELECT u.id, u.full_name AS fullName, u.mobile, g.gold_grams AS grams, g.updated_at AS updatedAt
  FROM users u JOIN gold_assets g ON g.user_id = u.id`;

export const getByMobile = (db, mobile) => db.prepare(`${SELECT} WHERE u.mobile = ?`).bind(mobile).first();
export const listUsers = async (db) => (await db.prepare(`${SELECT} ORDER BY u.id`).all()).results;
export const mobileExists = async (db, mobile) =>
  !!(await db.prepare('SELECT 1 AS x FROM users WHERE mobile = ?').bind(mobile).first());

const createStmts = (db, fullName, mobile, grams) => [
  db.prepare('INSERT INTO users (full_name, mobile) VALUES (?, ?)').bind(fullName, mobile),
  db
    .prepare('INSERT INTO gold_assets (user_id, gold_grams, updated_at) SELECT id, ?, ? FROM users WHERE mobile = ?')
    .bind(round3(grams), nowIso(), mobile),
];

// batch() is one transaction: user + balance row are created together or not at all.
export const createUser = (db, fullName, mobile, grams) => db.batch(createStmts(db, fullName, mobile, grams));

export async function setGold(db, userId, grams) {
  const r = await db
    .prepare('UPDATE gold_assets SET gold_grams = ?, updated_at = ? WHERE user_id = ?')
    .bind(round3(grams), nowIso(), userId)
    .run();
  return r.meta.changes > 0;
}

export const deleteUser = (db, id) => db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

export function reseed(db) {
  return db.batch([
    db.prepare('DELETE FROM gold_assets'),
    db.prepare('DELETE FROM users'),
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('users','gold_assets')"),
    ...SEED_USERS.flatMap(([n, m, g]) => createStmts(db, n, m, g)),
  ]);
}

/** floor(grams * price) in integer milligrams, avoiding float drift. */
export const valueToman = (grams, pricePerGram) => Math.floor((Math.round(grams * 1000) * pricePerGram) / 1000);
