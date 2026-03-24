const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const log = require('../utils/logger');

const router = express.Router();
const getUser = (req) => req.body?.submitted_by || req.headers['x-user'] || 'Unknown';

// GET /api/expenses
router.get('/', (req, res) => {
  try {
    const { from, to, category, search, sort = 'expense_date', order = 'desc' } = req.query;
    const validSorts = ['expense_date','amount','category','created_at'];
    const sortCol = validSorts.includes(sort) ? sort : 'expense_date';
    const sortDir = order === 'asc' ? 'asc' : 'desc';

    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];
    if (from)     { query += ' AND expense_date >= ?'; params.push(from); }
    if (to)       { query += ' AND expense_date <= ?'; params.push(to); }
    if (category) { query += ' AND category = ?'; params.push(category); }
    if (search)   { query += ' AND notes LIKE ?'; params.push(`%${search}%`); }

    query += ` ORDER BY ${sortCol} ${sortDir}`;
    const expenses = db.prepare(query).all(...params);
    res.json({ data: expenses, total: expenses.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/expenses/:id
router.get('/:id', (req, res) => {
  try {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/expenses
router.post('/', (req, res) => {
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
    db.prepare(`
      INSERT INTO expenses (id, amount, category, expense_date, notes, submitted_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, amount, category, expense_date, notes || null, user);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    log(user, 'created', 'expense', id, `${category} expense`, { amount, category });
    res.status(201).json(expense);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/expenses/:id
router.patch('/:id', (req, res) => {
  try {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const allowed = ['amount','category','expense_date','notes'];
    const updates = []; const vals = []; const changes = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = ?`); vals.push(req.body[key]);
        if (expense[key] !== req.body[key]) changes[key] = { from: expense[key], to: req.body[key] };
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No valid fields' });

    const user = getUser(req);
    vals.push(req.params.id);
    db.prepare(`UPDATE expenses SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
    const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    log(user, 'updated', 'expense', req.params.id, `${expense.category} expense`, changes);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
  try {
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    const user = getUser(req);
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    log(user, 'deleted', 'expense', req.params.id, `${expense.category} expense`, { amount: expense.amount });
    res.json({ message: 'Expense deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
