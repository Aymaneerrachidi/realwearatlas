const express = require('express');
const { db } = require('../database/db');

const router = express.Router();
const errMsg = (err) => err?.message || String(err) || 'Unknown error';

// GET /api/activity
router.get('/', async (req, res) => {
  try {
    const { user, action, entity_type, from, to, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM activity_log WHERE 1=1';
    const args = [];
    if (user)        { sql += ' AND user_name = ?'; args.push(user); }
    if (action)      { sql += ' AND action = ?'; args.push(action); }
    if (entity_type) { sql += ' AND entity_type = ?'; args.push(entity_type); }
    if (from)        { sql += ' AND created_at >= ?'; args.push(from); }
    if (to)          { sql += ' AND created_at <= ?'; args.push(to + ' 23:59:59'); }

    const countRes = await db.execute({ sql: `SELECT COUNT(*) AS cnt FROM (${sql})`, args });
    const total = Number(countRes.rows[0].cnt);

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    args.push(parseInt(limit), parseInt(offset));

    const result = await db.execute({ sql, args });
    res.json({ data: result.rows, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// GET /api/activity/users
router.get('/users', async (req, res) => {
  try {
    const result = await db.execute('SELECT DISTINCT user_name FROM activity_log ORDER BY user_name');
    res.json(result.rows.map(r => r.user_name));
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

module.exports = router;
