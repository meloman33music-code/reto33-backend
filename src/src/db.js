const path = require('path');
const Database = require('better-sqlite3');

// En Render (plan gratis) el disco es efímero: este archivo se borra en cada
// redeploy. Para producción real, migra esto a Postgres (ej. Supabase/Neon,
// ambos con plan gratis). Para probar el flujo completo, SQLite es suficiente.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');
const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  streak INTEGER NOT NULL DEFAULT 0,
  best INTEGER NOT NULL DEFAULT 0,
  last_date TEXT,
  confirmed_dates TEXT NOT NULL DEFAULT '[]',
  celebrated33 INTEGER NOT NULL DEFAULT 0,
  cycles INTEGER NOT NULL DEFAULT 0,
  just_broken INTEGER NOT NULL DEFAULT 0,
  gp_frequency INTEGER,
  gp_target_count INTEGER DEFAULT 3,
  last_gp_update_streak INTEGER NOT NULL DEFAULT 0,
  gp_notified_failure INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS growth_partners(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL
);
`);

function rowToItem(row, partners) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    streak: row.streak,
    best: row.best,
    lastDate: row.last_date,
    confirmedDates: JSON.parse(row.confirmed_dates),
    celebrated33: !!row.celebrated33,
    cycles: row.cycles,
    justBroken: !!row.just_broken,
    gpFrequency: row.gp_frequency,
    gpTargetCount: row.gp_target_count,
    lastGpUpdateStreak: row.last_gp_update_streak,
    gpNotifiedFailure: !!row.gp_notified_failure,
    createdAt: row.created_at,
    growthPartners: partners || []
  };
}

function getItem(id) {
  const row = db.prepare('SELECT * FROM items WHERE id=?').get(id);
  if (!row) return null;
  const partners = db.prepare('SELECT * FROM growth_partners WHERE item_id=?').all(id);
  return rowToItem(row, partners);
}

function getActiveItems() {
  const rows = db.prepare("SELECT * FROM items WHERE status='active'").all();
  return rows.map(row => {
    const partners = db.prepare('SELECT * FROM growth_partners WHERE item_id=?').all(row.id);
    return rowToItem(row, partners);
  });
}

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}

function createUser(name, phone) {
  const info = db.prepare('INSERT INTO users (name, phone) VALUES (?,?)').run(name, phone);
  return getUser(info.lastInsertRowid);
}

function createItem(userId, name, kind) {
  const info = db.prepare(
    `INSERT INTO items (user_id, name, kind, status, created_at) VALUES (?,?,?,?,?)`
  ).run(userId, name, kind, 'active', new Date().toISOString());
  return getItem(info.lastInsertRowid);
}

function addGrowthPartner(itemId, name, phone) {
  db.prepare('INSERT INTO growth_partners (item_id, name, phone) VALUES (?,?,?)').run(itemId, name, phone);
}

function setGpFrequency(itemId, freq, targetCount) {
  db.prepare('UPDATE items SET gp_frequency=?, gp_target_count=? WHERE id=?').run(freq, targetCount, itemId);
}

function saveItem(item) {
  db.prepare(`UPDATE items SET
    streak=?, best=?, last_date=?, confirmed_dates=?, celebrated33=?, cycles=?, just_broken=?,
    last_gp_update_streak=?, gp_notified_failure=?, status=?
    WHERE id=?`).run(
    item.streak, item.best, item.lastDate, JSON.stringify(item.confirmedDates),
    item.celebrated33 ? 1 : 0, item.cycles, item.justBroken ? 1 : 0,
    item.lastGpUpdateStreak, item.gpNotifiedFailure ? 1 : 0, item.status,
    item.id
  );
}

module.exports = {
  db, getItem, getActiveItems, getUser, createUser, createItem,
  addGrowthPartner, setGpFrequency, saveItem
};
