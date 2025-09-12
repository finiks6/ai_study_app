const express = require('express');
const {
  insertSummary,
  getSummaries,
  getSummaryById,
  deleteSummary,
  insertAdImpression,
  countAdImpressions,
} = require('../db');
const requireAuth = require('../middleware/auth');
const escapeHtml = require('../utils/escapeHtml');
const { simpleSummarize, answerQuestion, generateFlashcards } = require('../utils/ai');

const router = express.Router();

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
    res.render('summary', {
      title: 'Summary Detail',
      text: row.text,
      summary: summaryHtml,
      id,
    });
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
  const feature = req.query.feature;
  countAdImpressions(req.session.userId, feature, (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ count: row?.count || 0 });
  });
});

module.exports = router;
