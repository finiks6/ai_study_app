const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database('data.sqlite');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS summaries (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT, summary TEXT)');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: 'AI Study App' });
});

function simpleSummarize(text) {
  return text.split(/\s+/).slice(0, 50).join(' ');
}

app.post('/api/summarize', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  const summary = simpleSummarize(text);
  db.run('INSERT INTO summaries (text, summary) VALUES (?, ?)', [text, summary], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, summary });
  });
});

app.get('/api/summaries', (req, res) => {
  db.all('SELECT id, summary FROM summaries ORDER BY id DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ summaries: rows });
  });
});

app.get('/summaries/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT text, summary FROM summaries WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (!row) {
      return res.status(404).send('Not found');
    }
    res.render('summary', { title: 'Summary Detail', text: row.text, summary: row.summary });
  });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

module.exports = app;
