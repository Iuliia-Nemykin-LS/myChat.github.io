const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "chat.db");

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }
  return db;
}

function getAllMessages() {
  return getDb()
    .prepare("SELECT id, role, content, created_at FROM messages ORDER BY id ASC")
    .all();
}

function addMessage(role, content) {
  const result = getDb()
    .prepare("INSERT INTO messages (role, content) VALUES (?, ?)")
    .run(role, content);
  return result.lastInsertRowid;
}

function clearMessages() {
  getDb().exec("DELETE FROM messages");
}

module.exports = { getAllMessages, addMessage, clearMessages };
