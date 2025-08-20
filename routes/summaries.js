const express = require('express');
const { insertSummary, getSummaries, getSummaryById } = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

async function simpleSummarize(text) {
  const apiKey = process.env.HF_API_KEY;
  const maxChunkSize = 4000; // characters
  const fallback = (str) => str.split(/\s+/).slice(0, 50).join(' ');

  const chunks = [];
  for (let i = 0; i < text.length; i += maxChunkSize) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }

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

router.post('/api/summarize', requireAuth, async (req, res) => {
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

  insertSummary(req.session.userId, text, summary, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ id: this.lastID, summary });
  });
});

router.get('/api/summaries', requireAuth, (req, res) => {
  getSummaries(req.session.userId, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ summaries: rows });
  });
});

router.get('/summaries/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  getSummaryById(id, req.session.userId, (err, row) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    if (!row) {
      return res.status(404).send('Not found');
    }
    res.render('summary', { title: 'Summary Detail', text: row.text, summary: row.summary });
  });
});

module.exports = router;
