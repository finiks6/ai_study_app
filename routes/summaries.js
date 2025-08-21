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

  function formatNotes(str) {
    const sentences = str.split(/(?<=[\.?!])\s+/).filter(Boolean);
    const bulletPoints = sentences.map((s) => `- ${s.trim()}`);
    return ['## Summary', ...bulletPoints].join('\n');
  }

  const chunks = [];
  for (let i = 0; i < text.length; i += maxChunkSize) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }

  // If no API key, simply fall back to crude truncation.
  if (!apiKey) {
    return formatNotes(chunks.map(fallback).join(' '));
  }

  async function summarizeChunk(chunk) {
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
        return data[0].summary_text;
      }
      if (data.error) {
        throw new Error(data.error);
      }
      return fallback(chunk);
    } catch (err) {
      console.error('Summarization error:', err.message);
      return fallback(chunk);
    }
  }

  // Summarize all chunks in parallel for speed.
  const summaries = await Promise.all(chunks.map(summarizeChunk));
  let combined = summaries.join(' ');

  // Run a second pass to tighten the final summary if it's still long.
  if (combined.length > maxChunkSize) {
    try {
      combined = await summarizeChunk(combined);
    } catch {
      combined = fallback(combined);
    }
  }

  return formatNotes(combined);
}

router.post('/api/summarize', requireAuth, async (req, res) => {
  const { text, images = [] } = req.body;
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

  if (Array.isArray(images) && images.length) {
    const imgLines = images.map((img) => `- ${img.caption || 'Image'}\n<img src="${img.url}" alt="${img.caption || ''}" />`);
    summary = `${summary}\n${imgLines.join('\n')}`;
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
    const summaryHtml = row.summary.replace(/\n/g, '<br>');
    res.render('summary', { title: 'Summary Detail', text: row.text, summary: summaryHtml });
  });
});

module.exports = router;
