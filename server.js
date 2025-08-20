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

async function simpleSummarize(text) {
  const apiKey = process.env.HF_API_KEY;
  const maxChunkSize = 4000; // characters
  const fallback = (str) => str.split(/\s+/).slice(0, 50).join(' ');

  // Split text into manageable chunks for the API
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChunkSize) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }

  // If no API key is provided, use the fallback summarizer
  if (!apiKey) {
    return chunks.map(fallback).join(' ');
  }

  const summaries = [];
  for (const chunk of chunks) {
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ inputs: chunk, options: { wait_for_model: true } }),
        }
      );

      if (!response.ok) {
        throw new Error(`API response status: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data) && data[0] && data[0].summary_text) {
        summaries.push(data[0].summary_text);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        summaries.push(fallback(chunk));
      }
    } catch (err) {
      console.error('Summarization error:', err.message);
      summaries.push(fallback(chunk));
    }
  }

  return summaries.join(' ');
}

app.post('/api/summarize', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  let summary;
  try {
    summary = await simpleSummarize(text);
  } catch (err) {
    console.error('Summarization failed:', err.message);
    summary = text.split(/\s+/).slice(0, 50).join(' ');
  }

  db.run('INSERT INTO summaries (text, summary) VALUES (?, ?)', [text, summary], function (err) {
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
