const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const log = require('../utils/logger');

const router = express.Router();
const getUser = (req) => req.body?.submitted_by || req.headers['x-user'] || 'Unknown';
const errMsg = (err) => { if (!err) return 'Unknown error'; if (typeof err === 'string') return err; if (err.message) return err.message; try { const s = JSON.stringify(err); return (s && s !== '{}') ? s : 'Unknown error'; } catch { return 'Unknown error'; } };

const SALE_SELECT = `
  SELECT s.*, i.name AS item_name, i.brand, i.category, i.purchase_price,
         (s.selling_price - i.purchase_price) AS profit,
         ROUND(((s.selling_price - i.purchase_price) / s.selling_price) * 100, 2) AS margin
  FROM sales s JOIN items i ON s.item_id = i.id
`;

// GET /api/sales
router.get('/', async (req, res) => {
  try {
    const { from, to, category, search, sort = 'sale_date', order = 'desc' } = req.query;
    const validSorts = ['sale_date','selling_price','buyer_name','platform','created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'sale_date';
    const sortDir = order === 'asc' ? 'asc' : 'desc';

    let sql = SALE_SELECT + ' WHERE 1=1';
    const args = [];
    if (from)     { sql += ' AND s.sale_date >= ?'; args.push(from); }
    if (to)       { sql += ' AND s.sale_date <= ?'; args.push(to); }
    if (category) { sql += ' AND i.category = ?'; args.push(category); }
    if (search)   { sql += ' AND (i.name LIKE ? OR i.brand LIKE ? OR s.buyer_name LIKE ?)'; args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    sql += ` ORDER BY s.${sortCol} ${sortDir}`;

    const result = await db.execute({ sql, args });
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// GET /api/sales/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: SALE_SELECT + ' WHERE s.id = ?', args: [req.params.id] });
    const sale = result.rows[0];
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const { item_id, selling_price, sale_date, buyer_name, buyer_contact, platform = 'Instagram', notes } = req.body;
    if (!item_id || selling_price == null || !sale_date) {
      return res.status(400).json({ error: 'Missing required fields: item_id, selling_price, sale_date' });
    }

    const itemRes = await db.execute({ sql: 'SELECT * FROM items WHERE id = ?', args: [item_id] });
    const item = itemRes.rows[0];
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status === 'sold') return res.status(400).json({ error: 'Item already sold' });

    const id = uuidv4();
    const user = getUser(req);
    const profit = selling_price - item.purchase_price;

    await db.execute({
      sql: `INSERT INTO sales (id, item_id, selling_price, sale_date, buyer_name, buyer_contact, platform, notes, submitted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, item_id, selling_price, sale_date, buyer_name || null, buyer_contact || null, platform, notes || null, user],
    });
    await db.execute({ sql: `UPDATE items SET status = 'sold' WHERE id = ?`, args: [item_id] });

    const sale = (await db.execute({ sql: SALE_SELECT + ' WHERE s.id = ?', args: [id] })).rows[0];
    await log(user, 'created', 'sale', id, item.name, { selling_price, profit: profit.toFixed(2), platform });
    res.status(201).json(sale);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// PATCH /api/sales/:id
router.patch('/:id', async (req, res) => {
  try {
    const saleRes = await db.execute({ sql: 'SELECT * FROM sales WHERE id = ?', args: [req.params.id] });
    const sale = saleRes.rows[0];
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const allowed = ['selling_price','sale_date','buyer_name','buyer_contact','platform','notes','submitted_by'];
    const updates = []; const args = []; const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`); args.push(req.body[key]);
        if (sale[key] !== req.body[key]) changes[key] = { from: sale[key], to: req.body[key] };
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields' });

    const user = getUser(req);
    args.push(req.params.id);
    await db.execute({ sql: `UPDATE sales SET ${updates.join(', ')} WHERE id = ?`, args });

    const updated = (await db.execute({ sql: SALE_SELECT + ' WHERE s.id = ?', args: [req.params.id] })).rows[0];
    await log(user, 'updated', 'sale', req.params.id, updated.item_name, changes);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
  try {
    const saleRes = await db.execute({ sql: SALE_SELECT + ' WHERE s.id = ?', args: [req.params.id] });
    const sale = saleRes.rows[0];
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    const user = getUser(req);
    await db.execute({ sql: 'DELETE FROM sales WHERE id = ?', args: [req.params.id] });
    await db.execute({ sql: `UPDATE items SET status = 'available' WHERE id = ?`, args: [sale.item_id] });

    await log(user, 'deleted', 'sale', req.params.id, sale.item_name, { selling_price: sale.selling_price });
    res.json({ message: 'Sale deleted, item restored to available' });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

module.exports = router;
