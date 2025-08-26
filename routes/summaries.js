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
  const hfKey = process.env.HF_API_KEY;
  const maxChunkSize = 4000; // characters

  function fallback(str) {
    const sentences = str.match(/[^.!?]+[.!?]/g) || [str];
    const words = str.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const scored = sentences.map((s) => {
      const score = (s.toLowerCase().match(/\b[a-z]{3,}\b/g) || []).reduce(
        (sum, w) => sum + (freq[w] || 0),
        0
      );
      return { s: s.trim(), score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, Math.min(3, scored.length)).map((o) => o.s);
    return top.join(' ');
  }

  function formatNotes(str) {
    const sentences = str.split(/(?<=[\.?!])\s+/).filter(Boolean);
    const bulletPoints = sentences.map((s) => `- ${s.trim()}`);
    return ['## Summary', ...bulletPoints].join('\n');
  }

  const chunks = [];
  for (let i = 0; i < text.length; i += maxChunkSize) {
    chunks.push(text.slice(i, i + maxChunkSize));
  }

  async function summarizeChunk(chunk) {
    try {
      if (hfKey) {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${hfKey}`,
            },
            body: JSON.stringify({ inputs: chunk, options: { wait_for_model: true } }),
          }
        );

        if (!response.ok) {
          throw new Error(`HF status ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.summary_text) {
          return data[0].summary_text;
        }
        if (data.error) {
          throw new Error(data.error);
        }
        return fallback(chunk);
      }

      // Free API using Jina's summarizer. Returns plain text.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch('https://r.jina.ai/http://', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: chunk,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        throw new Error(`Jina status ${resp.status}`);
      }
      const txt = await resp.text();
      return txt.trim() || fallback(chunk);
    } catch (err) {
      console.error('Summarization error:', err.message);
      return fallback(chunk);
    }
  }

  const summaries = await Promise.all(chunks.map(summarizeChunk));
  let combined = summaries.join(' ');

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
