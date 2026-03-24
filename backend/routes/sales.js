const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const log = require('../utils/logger');

const router = express.Router();
const getUser = (req) => req.body?.submitted_by || req.headers['x-user'] || 'Unknown';

const SALE_SELECT = `
  SELECT s.*, i.name AS item_name, i.brand, i.category, i.purchase_price,
         (s.selling_price - i.purchase_price) AS profit,
         ROUND(((s.selling_price - i.purchase_price) / s.selling_price) * 100, 2) AS margin
  FROM sales s JOIN items i ON s.item_id = i.id
`;

// GET /api/sales
router.get('/', (req, res) => {
  try {
    const { from, to, category, search, sort = 'sale_date', order = 'desc' } = req.query;
    const validSorts = ['sale_date','selling_price','buyer_name','platform','created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'sale_date';
    const sortDir = order === 'asc' ? 'asc' : 'desc';

    let query = SALE_SELECT + ' WHERE 1=1';
    const params = [];
    if (from)     { query += ' AND s.sale_date >= ?'; params.push(from); }
    if (to)       { query += ' AND s.sale_date <= ?'; params.push(to); }
    if (category) { query += ' AND i.category = ?'; params.push(category); }
    if (search)   { query += ' AND (i.name LIKE ? OR i.brand LIKE ? OR s.buyer_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    query += ` ORDER BY s.${sortCol} ${sortDir}`;
    const sales = db.prepare(query).all(...params);
    res.json({ data: sales, total: sales.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/sales/:id
router.get('/:id', (req, res) => {
  try {
    const sale = db.prepare(SALE_SELECT + ' WHERE s.id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/sales
router.post('/', (req, res) => {
  try {
    const { item_id, selling_price, sale_date, buyer_name, buyer_contact, platform = 'Instagram', notes } = req.body;
    if (!item_id || selling_price == null || !sale_date) {
      return res.status(400).json({ error: 'Missing required fields: item_id, selling_price, sale_date' });
    }
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status === 'sold') return res.status(400).json({ error: 'Item already sold' });

    const id = uuidv4();
    const user = getUser(req);
    const profit = selling_price - item.purchase_price;

    db.transaction(() => {
      db.prepare(`
        INSERT INTO sales (id, item_id, selling_price, sale_date, buyer_name, buyer_contact, platform, notes, submitted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, item_id, selling_price, sale_date, buyer_name || null, buyer_contact || null, platform, notes || null, user);
      db.prepare(`UPDATE items SET status = 'sold' WHERE id = ?`).run(item_id);
    })();

    const sale = db.prepare(SALE_SELECT + ' WHERE s.id = ?').get(id);
    log(user, 'created', 'sale', id, item.name, { selling_price, profit: profit.toFixed(2), platform });
    res.status(201).json(sale);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/sales/:id
router.patch('/:id', (req, res) => {
  try {
    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const allowed = ['selling_price','sale_date','buyer_name','buyer_contact','platform','notes'];
    const updates = []; const vals = []; const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`); vals.push(req.body[key]);
        if (sale[key] !== req.body[key]) changes[key] = { from: sale[key], to: req.body[key] };
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields' });

    const user = getUser(req);
    vals.push(req.params.id);
    db.prepare(`UPDATE sales SET ${updates.join(', ')} WHERE id = ?`).run(...vals);

    const updated = db.prepare(SALE_SELECT + ' WHERE s.id = ?').get(req.params.id);
    log(user, 'updated', 'sale', req.params.id, updated.item_name, changes);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/sales/:id
router.delete('/:id', (req, res) => {
  try {
    const sale = db.prepare(SALE_SELECT + ' WHERE s.id = ?').get(req.params.id);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const user = getUser(req);
    db.transaction(() => {
      db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
      db.prepare(`UPDATE items SET status = 'available' WHERE id = ?`).run(sale.item_id);
    })();
    log(user, 'deleted', 'sale', req.params.id, sale.item_name, { selling_price: sale.selling_price });
    res.json({ message: 'Sale deleted, item restored to available' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
