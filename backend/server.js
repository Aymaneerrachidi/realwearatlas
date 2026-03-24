require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { ready } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Wait for DB init before handling any request
app.use(async (req, res, next) => { await ready; next(); });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/items',     require('./routes/items'));
app.use('/api/sales',     require('./routes/sales'));
app.use('/api/expenses',  require('./routes/expenses'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/activity',  require('./routes/activity'));

app.get('/api/health', async (req, res) => {
  try {
    const { db } = require('./database/db');
    await db.execute('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'failed', error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start the HTTP server when run directly (local dev)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🎽 RealWear Atlas API running on http://localhost:${PORT}\n`);
  });
}

module.exports = app;
