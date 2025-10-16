require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('./db');
const authRoutes = require('./routes/auth');
const summaryRoutes = require('./routes/summaries');

const app = express();
// --- Security & hardening ---
app.set('trust proxy', 1); // if behind proxy (Render)
app.use(helmet({ contentSecurityPolicy: false })); // keep simple for now
app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// --- Request logging (minimal) ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms`);
  });
  next();
});

// --- Uploads (PDF only, max 10MB) ---
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  }
});
// Example usage later: app.post('/upload', upload.single('pdf'), yourHandler);

// --- Fetch timeout helper you can use in routes ---
const withTimeout = (promise, ms = 15000) => {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error('Upstream timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
};
app.set('aiFetch', withTimeout);

// --- Healthcheck (for hosting) ---
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('welcome', { title: 'AI Study App' });
});

app.get('/summarize', (req, res) => {
  res.render('index', { title: 'AI Study App' });
});

app.use(authRoutes);
app.use(summaryRoutes);

const port = process.env.PORT || 3000;
if (require.main === module) {
  // --- Generic error handler (keep as last middleware) ---
app.use((err, req, res, _next) => {
  console.error(err);
  const code = err.status || 500;
  res.status(code);
  if (req.xhr || req.path.startsWith('/api/')) {
    return res.json({ ok: false, error: err.message || 'Server error' });
  }
  try {
    res.render('error', { code, message: err.message || 'Something went wrong' });
  } catch {
    res.type('text').send(`Error ${code}: ${err.message || 'Something went wrong'}`);
  }
});
app.listen(port, () => console.log(`Server listening on port ${port}`));
}

module.exports = app;
