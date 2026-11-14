'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const MOBILE_RE = /^09\d{9}$/;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT NOT NULL,
  mobile     TEXT NOT NULL UNIQUE CHECK (mobile GLOB '09[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS gold_assets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  gold_grams REAL NOT NULL DEFAULT 0 CHECK (gold_grams >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
`;

function open(dbPath) {
  const resolved = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const round3 = (n) => Math.round(n * 1000) / 1000;

function createQueries(db) {
  const insUser = db.prepare('INSERT INTO users (full_name, mobile) VALUES (?, ?)');
  const insGold = db.prepare('INSERT INTO gold_assets (user_id, gold_grams, updated_at) VALUES (?, ?, ?)');
  const createTx = db.transaction((fullName, mobile, grams) => {
    const { lastInsertRowid } = insUser.run(fullName, mobile);
    insGold.run(lastInsertRowid, round3(grams), nowIso());
    return Number(lastInsertRowid);
  });

  const byMobile = db.prepare(`
    SELECT u.id, u.full_name AS fullName, u.mobile, g.gold_grams AS grams, g.updated_at AS updatedAt
    FROM users u JOIN gold_assets g ON g.user_id = u.id WHERE u.mobile = ?`);
  const all = db.prepare(`
    SELECT u.id, u.full_name AS fullName, u.mobile, g.gold_grams AS grams, g.updated_at AS updatedAt
    FROM users u JOIN gold_assets g ON g.user_id = u.id ORDER BY u.id`);
  const mobileExists = db.prepare('SELECT 1 FROM users WHERE mobile = ?');
  const setGold = db.prepare('UPDATE gold_assets SET gold_grams = ?, updated_at = ? WHERE user_id = ?');
  const delUser = db.prepare('DELETE FROM users WHERE id = ?');
  const clearAll = db.transaction(() => {
    db.exec('DELETE FROM gold_assets; DELETE FROM users;');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','gold_assets')");
  });

  return {
    createUser: (fullName, mobile, grams) => createTx(fullName, mobile, grams),
    getByMobile: (mobile) => byMobile.get(mobile),
    listUsers: () => all.all(),
    mobileExists: (mobile) => !!mobileExists.get(mobile),
    setGold: (userId, grams) => setGold.run(round3(grams), nowIso(), userId).changes > 0,
    deleteUser: (id) => delUser.run(id).changes > 0,
    clearAll: () => clearAll(),
  };
}

/** value = floor(grams * price), computed in integer milligrams to avoid float drift. */
function valueToman(grams, pricePerGram) {
  return Math.floor((Math.round(grams * 1000) * pricePerGram) / 1000);
}

module.exports = { open, createQueries, valueToman, round3, MOBILE_RE };
