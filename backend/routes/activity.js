const express = require('express');
const db = require('../database/db');

const router = express.Router();

// GET /api/activity — full log with filters
router.get('/', (req, res) => {
  try {
    const { user, action, entity_type, from, to, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM activity_log WHERE 1=1';
    const params = [];
    if (user)        { query += ' AND user_name = ?'; params.push(user); }
    if (action)      { query += ' AND action = ?'; params.push(action); }
    if (entity_type) { query += ' AND entity_type = ?'; params.push(entity_type); }
    if (from)        { query += ' AND created_at >= ?'; params.push(from); }
    if (to)          { query += ' AND created_at <= ?'; params.push(to + ' 23:59:59'); }

    const total = db.prepare(`SELECT COUNT(*) AS cnt FROM (${query})`).get(...params).cnt;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const rows = db.prepare(query).all(...params);
    res.json({ data: rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/activity/users — distinct users
router.get('/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT user_name FROM activity_log ORDER BY user_name').all();
    res.json(rows.map(r => r.user_name));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
