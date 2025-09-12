const express = require('express');
const router = express.Router();

// Simple in-memory ad inventory. In a production app these could
// come from a database or an ad network. Each item contains HTML
// that will be injected into the page.
const ads = [
  { html: '<a href="https://example.com/premium">Upgrade your studying with Premium Notes!</a>' },
  { html: '<a href="https://example.com/books">Discount textbooks at BookBarn. Shop now.</a>' },
  { html: '<a href="https://example.com/tools">Flashcard Maker – make learning fun.</a>' },
];

router.get('/api/ad', (req, res) => {
  const ad = ads[Math.floor(Math.random() * ads.length)];
  res.json(ad);
});

module.exports = router;
