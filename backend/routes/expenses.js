const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const log = require('../utils/logger');

const router = express.Router();
const getUser = (req) => req.body?.submitted_by || req.headers['x-user'] || 'Unknown';
const errMsg = (err) => { if (!err) return 'Unknown error'; if (typeof err === 'string') return err; if (err.message) return err.message; try { const s = JSON.stringify(err); return (s && s !== '{}') ? s : 'Unknown error'; } catch { return 'Unknown error'; } };

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { from, to, category, search, sort = 'expense_date', order = 'desc' } = req.query;
    const validSorts = ['expense_date','amount','category','created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'expense_date';
    const sortDir = order === 'asc' ? 'asc' : 'desc';

    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const args = [];
    if (from)     { sql += ' AND expense_date >= ?'; args.push(from); }
    if (to)       { sql += ' AND expense_date <= ?'; args.push(to); }
    if (category) { sql += ' AND category = ?'; args.push(category); }
    if (search)   { sql += ' AND notes LIKE ?'; args.push(`%${search}%`); }
    sql += ` ORDER BY ${sortCol} ${sortDir}`;

    const result = await db.execute({ sql, args });
    res.json({ data: result.rows, total: result.rows.length });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({ sql: 'SELECT * FROM expenses WHERE id = ?', args: [req.params.id] });
    const expense = result.rows[0];
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { amount, category, expense_date, notes } = req.body;
    if (!amount || !category || !expense_date) {
      return res.status(400).json({ error: 'Missing required fields: amount, category, expense_date' });
    }
    const validCats = ['ads','shipping','packaging','misc'];
    if (!validCats.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${validCats.join(', ')}` });
    }
    const id = uuidv4();
    const user = getUser(req);
    await db.execute({
      sql: `INSERT INTO expenses (id, amount, category, expense_date, notes, submitted_by) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, amount, category, expense_date, notes || null, user],
    });
    const expense = (await db.execute({ sql: 'SELECT * FROM expenses WHERE id = ?', args: [id] })).rows[0];
    await log(user, 'created', 'expense', id, `${category} expense`, { amount, category });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// PATCH /api/expenses/:id
router.patch('/:id', async (req, res) => {
  try {
    const expRes = await db.execute({ sql: 'SELECT * FROM expenses WHERE id = ?', args: [req.params.id] });
    const expense = expRes.rows[0];
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const allowed = ['amount','category','expense_date','notes'];
    const updates = []; const args = []; const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`); args.push(req.body[key]);
        if (expense[key] !== req.body[key]) changes[key] = { from: expense[key], to: req.body[key] };
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields' });

    const user = getUser(req);
    args.push(req.params.id);
    await db.execute({ sql: `UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`, args });
    const updated = (await db.execute({ sql: 'SELECT * FROM expenses WHERE id = ?', args: [req.params.id] })).rows[0];
    await log(user, 'updated', 'expense', req.params.id, `${expense.category} expense`, changes);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const expRes = await db.execute({ sql: 'SELECT * FROM expenses WHERE id = ?', args: [req.params.id] });
    const expense = expRes.rows[0];
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const user = getUser(req);
    await db.execute({ sql: 'DELETE FROM expenses WHERE id = ?', args: [req.params.id] });
    await log(user, 'deleted', 'expense', req.params.id, `${expense.category} expense`, { amount: expense.amount });
    res.json({ message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ error: errMsg(err) }); }
});

module.exports = router;
