require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DB_FILE || 'data.sqlite');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)');
  db.run(`CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    text TEXT,
    summary TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

function createUser(username, password, cb) {
  db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password], cb);
}

function findUserByUsername(username, cb) {
  db.get('SELECT id, password FROM users WHERE username = ?', [username], cb);
}

function getUserById(id, cb) {
  db.get('SELECT id, username FROM users WHERE id = ?', [id], cb);
}

function insertSummary(userId, text, summary, cb) {
  db.run('INSERT INTO summaries (user_id, text, summary) VALUES (?, ?, ?)', [userId, text, summary], cb);
}

function getSummaries(userId, cb) {
  db.all('SELECT id, summary FROM summaries WHERE user_id = ? ORDER BY id DESC', [userId], cb);
}

function getSummaryById(id, userId, cb) {
  db.get('SELECT text, summary FROM summaries WHERE id = ? AND user_id = ?', [id, userId], cb);
}

function deleteSummary(id, userId, cb) {
  db.run('DELETE FROM summaries WHERE id = ? AND user_id = ?', [id, userId], cb);
}

module.exports = {
  createUser,
  findUserByUsername,
  getUserById,
  insertSummary,
  getSummaries,
  getSummaryById,
  deleteSummary,
};
