const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const log = require('../utils/logger');

const router = express.Router();
const getUser = (req) => req.body?.submitted_by || req.headers['x-user'] || 'Unknown';
const errMsg = (err) => { if (!err) return 'Unknown error'; if (typeof err === 'string') return err; if (err.message) return err.message; try { const s = JSON.stringify(err); return (s && s !== '{}') ? s : 'Unknown error'; } catch { return 'Unknown error'; } };

// GET /api/items
router.get('/', async (req, res) => {
  try {
    const { status, category, search, sort = 'created_at', order = 'desc', limit = '15', page = '1' } = req.query;
    const validSorts = ['name','brand','category','purchase_price','purchase_date','status','created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order === 'asc' ? 'asc' : 'desc';
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 50);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT id, name, brand, category, purchase_price, selling_price, status,
              purchase_date, notes,
              CASE WHEN image_url LIKE 'data:%' THEN NULL ELSE image_url END AS image_url,
              submitted_by, created_at, updated_at
           FROM items WHERE 1=1`;
    const args = [];
    if (status)   { sql += ' AND status = ?';   args.push(status); }
    if (category) { sql += ' AND category = ?'; args.push(category); }
    if (search)   { sql += ' AND (name LIKE ? OR brand LIKE ? OR notes LIKE ?)'; args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ` ORDER BY ${sortCol} ${sortDir} LIMIT ? OFFSET ?`;
    args.push(limitNum, offset);

    const result = await db.execute({ sql, args });
    res.json({ data: result.rows, total: result.rows.length, page: pageNum, limit: limitNum });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// GET /api/items/meta/categories
router.get('/meta/categories', async (req, res) => {
  try {
    const result = await db.execute('SELECT DISTINCT category FROM items ORDER BY category');
    res.json(result.rows.map(r => r.category));
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT id, name, brand, category, purchase_price, selling_price, status,
           purchase_date, notes,
           CASE WHEN image_url LIKE 'data:%' THEN NULL ELSE image_url END AS image_url,
           submitted_by, created_at, updated_at
        FROM items WHERE id = ?`,
      args: [req.params.id],
    });
    const item = result.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status === 'sold') {
      const saleRes = await db.execute({ sql: 'SELECT * FROM sales WHERE item_id = ?', args: [item.id] });
      item.sale = saleRes.rows[0] || null;
    }
    res.json(item);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const {
      name, brand, category = 'other',
      purchase_price, purchase_date = new Date().toISOString().split('T')[0],
      notes, image_url, status = 'available',
    } = req.body;

    if (!name || purchase_price == null) {
      return res.status(400).json({ error: 'Missing required fields: name, purchase_price' });
    }
    if (image_url && typeof image_url === 'string' && image_url.startsWith('data:')) {
      return res.status(400).json({ error: 'Base64 images are not supported. Upload to an external image host.' });
    }

    const id = uuidv4();
    const user = getUser(req);

    await db.execute({
      sql: `INSERT INTO items (id, name, brand, category, purchase_price, purchase_date, notes, image_url, status, submitted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, name, brand || null, category, purchase_price, purchase_date, notes || null, image_url || null, status, user],
    });

    const created = (await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [id] })).rows[0];
    await log(user, 'created', 'item', id, name, { purchase_price, category, status });
    res.status(201).json(created);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// PATCH /api/items/:id
router.patch('/:id', async (req, res) => {
  try {
    const itemRes = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [req.params.id] });
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const allowed = ['name','brand','category','purchase_price','purchase_date','notes','image_url','status'];
    const updates = []; const args = []; const changes = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'image_url' && typeof req.body[key] === 'string' && req.body[key].startsWith('data:')) {
          return res.status(400).json({ error: 'Base64 images are not supported. Upload to an external image host.' });
        }
        updates.push(`${key} = ?`);
        args.push(req.body[key]);
        if (item[key] !== req.body[key]) changes[key] = { from: item[key], to: req.body[key] };
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    const user = getUser(req);
    args.push(req.params.id);
    await db.execute({ sql: `UPDATE items SET ${updates.join(', ')} WHERE id = ?`, args });

    const updated = (await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [req.params.id] })).rows[0];
    await log(user, 'updated', 'item', req.params.id, item.name, changes);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const itemRes = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [req.params.id] });
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const user = getUser(req);
    await db.execute({ sql: 'DELETE FROM sales WHERE item_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM items WHERE id = ?', args: [req.params.id] });
    log(user, 'deleted', 'item', req.params.id, item.name, { purchase_price: item.purchase_price, status: item.status });
    res.json({ message: 'Item deleted' });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

module.exports = router;
