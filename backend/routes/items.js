const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const log = require('../utils/logger');

const router = express.Router();

const getUser = (req) => req.body?.submitted_by || req.headers['x-user'] || 'Unknown';

// GET /api/items
router.get('/', (req, res) => {
  try {
    const { status, category, search, sort = 'created_at', order = 'desc' } = req.query;
    const validSorts = ['name','brand','category','purchase_price','purchase_date','status','created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'created_at';
    const sortDir = order === 'asc' ? 'asc' : 'desc';

    let query = 'SELECT * FROM items WHERE 1=1';
    const params = [];
    if (status)   { query += ' AND status = ?';   params.push(status); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search)   { query += ' AND (name LIKE ? OR brand LIKE ? OR notes LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    query += ` ORDER BY ${sortCol} ${sortDir}`;
    const items = db.prepare(query).all(...params);
    res.json({ data: items, total: items.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/items/meta/categories
router.get('/meta/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT category FROM items ORDER BY category').all();
    res.json(rows.map(r => r.category));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/items/:id
router.get('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status === 'sold') item.sale = db.prepare('SELECT * FROM sales WHERE item_id = ?').get(item.id) || null;
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/items — only name + purchase_price are truly required
router.post('/', (req, res) => {
  try {
    const {
      name, brand, category = 'other',
      purchase_price, purchase_date = new Date().toISOString().split('T')[0],
      notes, image_url, status = 'available',
    } = req.body;

    if (!name || purchase_price == null) {
      return res.status(400).json({ error: 'Missing required fields: name, purchase_price' });
    }

    const id = uuidv4();
    const user = getUser(req);

    db.prepare(`
      INSERT INTO items (id, name, brand, category, purchase_price, purchase_date, notes, image_url, status, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, brand || null, category, purchase_price, purchase_date, notes || null, image_url || null, status, user);

    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    log(user, 'created', 'item', id, name, { purchase_price, category, status });
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/items/:id
router.patch('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const allowed = ['name','brand','category','purchase_price','purchase_date','notes','image_url','status'];
    const updates = []; const vals = [];
    const changes = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`);
        vals.push(req.body[key]);
        if (item[key] !== req.body[key]) changes[key] = { from: item[key], to: req.body[key] };
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });

    const user = getUser(req);
    vals.push(req.params.id);
    db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...vals);

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    log(user, 'updated', 'item', req.params.id, item.name, changes);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/items/:id
router.delete('/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const user = getUser(req);
    db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
    log(user, 'deleted', 'item', req.params.id, item.name, { purchase_price: item.purchase_price, status: item.status });
    res.json({ message: 'Item deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
