require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');

require('./db');
const authRoutes = require('./routes/auth');
const summaryRoutes = require('./routes/summaries');
const adRoutes = require('./routes/ads');

const app = express();

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
app.use(adRoutes);

const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`Server listening on port ${port}`));
}

module.exports = app;
