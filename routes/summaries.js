const express = require('express');
const {
  insertSummary,
  getSummaries,
  getSummaryById,
  deleteSummary,
  insertAdImpression,
  countAdImpressions,
} = require('../db');

const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

async function answerQuestion(context, question) {
  const hfKey = process.env.HF_API_KEY;

  function fallbackQA(ctx, q) {
    const sentences = ctx.split(/(?<=[\.?!])\s+/).filter(Boolean);
    const qWords = q.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    let best = 'Answer not found.';
    let bestScore = 0;
    for (const s of sentences) {
      let score = 0;
      const lower = s.toLowerCase();
      for (const w of qWords) if (lower.includes(w)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = s.trim();
      }
    }
    return best;
  }

  if (hfKey) {
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/deepset/roberta-base-squad2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hfKey}`,
          },
          body: JSON.stringify({ inputs: { question, context } }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.answer) {
          return data.answer.trim();
        }
      }
    } catch (err) {
      console.error('QA error:', err.message);
    }
  }
  return fallbackQA(context, question);
}

async function generateFlashcards(text) {
  const hfKey = process.env.HF_API_KEY;

  function simpleFlashcards(str) {
    str = str.replace(/^##\s*Summary\s*/i, '');
    const sentences = str
      .split(/(?<=[.!?])\s+|\n/)
      .map((s) => s.replace(/^[-\s]+/, '').trim())
      .filter(Boolean);
    const cards = [];
    for (const s of sentences.slice(0, 5)) {
      const words = s.split(/\s+/);
      let idx = words.findIndex((w) => w.replace(/[^a-zA-Z]/g, '').length > 4);
      if (idx === -1) idx = 0;
      const answer = words[idx].replace(/[^a-zA-Z0-9]/g, '');
      const question = s.replace(words[idx], '_____');
      cards.push({ question: question.trim(), answer });
    }
    return cards;
  }

  if (hfKey) {
    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/iarfmoose/t5-base-question-generator',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hfKey}`,
          },
          body: JSON.stringify({ inputs: text }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const cards = data
            .map((item) => {
              const out = item.generated_text || item; // handle plain strings
              if (typeof out === 'string') {
                const parts = out.split('?');
                if (parts.length >= 2) {
                  return {
                    question: parts[0].trim() + '?',
                    answer: parts[1].trim(),
                  };
                }
              }
              return null;
            })
            .filter(Boolean);
          if (cards.length) return cards;
        }
      }
    } catch (err) {
      console.error('Flashcard generation error:', err.message);
    }
  }

  return simpleFlashcards(text);
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

  summary = escapeHtml(summary);

  if (Array.isArray(images) && images.length) {
    const imgLines = images.map((img) => {
      const cap = escapeHtml(img.caption || 'Image');
      const url = escapeHtml(img.url || '');
      return `- ${cap}\n<img src="${url}" alt="${cap}" />`;
    });
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
    res.render('summary', { title: 'Summary Detail', text: row.text, summary: summaryHtml, id });
  });
});

router.delete('/api/summaries/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  deleteSummary(id, req.session.userId, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Deleted' });
  });
});

router.post('/api/ask', requireAuth, (req, res) => {
  const { id, question } = req.body;
  if (!id || !question) {
    return res.status(400).json({ error: 'id and question required' });
  }
  getSummaryById(id, req.session.userId, async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    const context = row.summary.replace(/<[^>]+>/g, '');
    const answer = await answerQuestion(context, question);
    res.json({ answer });
  });
});

router.post('/api/flashcards', requireAuth, (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }
  getSummaryById(id, req.session.userId, async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    const context = row.summary.replace(/<[^>]+>/g, '');
    const flashcards = await generateFlashcards(context);
    res.json({ flashcards });
  });
});

router.post('/api/ads/impression', requireAuth, (req, res) => {
  const { feature = 'general' } = req.body || {};
  insertAdImpression(req.session.userId, feature, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ ok: true });
  });
});

router.get('/api/ads/impressions', requireAuth, (req, res) => {
  countAdImpressions(req.session.userId, (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row?.count || 0 });
  });
});

module.exports = router;
