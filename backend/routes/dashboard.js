const express = require('express');
const db = require('../database/db');

const router = express.Router();

// GET /api/dashboard/stats?from=&to=
router.get('/stats', (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = 'WHERE 1=1';
    const params = [];
    if (from) { dateFilter += ' AND sale_date >= ?'; params.push(from); }
    if (to)   { dateFilter += ' AND sale_date <= ?'; params.push(to); }

    // Revenue & profit from sales
    const salesStats = db.prepare(`
      SELECT
        COALESCE(SUM(s.selling_price), 0) AS total_revenue,
        COALESCE(SUM(s.selling_price - i.purchase_price), 0) AS total_profit,
        COUNT(*) AS total_sold,
        COALESCE(AVG(s.selling_price - i.purchase_price), 0) AS avg_profit_per_item,
        COALESCE(SUM(i.purchase_price), 0) AS total_cogs
      FROM sales s JOIN items i ON s.item_id = i.id
      ${dateFilter}
    `).get(...params);

    // Expenses
    let expFilter = 'WHERE 1=1';
    const expParams = [];
    if (from) { expFilter += ' AND expense_date >= ?'; expParams.push(from); }
    if (to)   { expFilter += ' AND expense_date <= ?'; expParams.push(to); }
    const expStats = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_expenses
      FROM expenses ${expFilter}
    `).get(...expParams);

    // Inventory counts
    const inventoryStats = db.prepare(`
      SELECT
        COUNT(*) AS total_items,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold,
        COALESCE(SUM(CASE WHEN status IN ('available','reserved') THEN purchase_price END), 0) AS inventory_value
      FROM items
    `).get();

    const net_profit = salesStats.total_profit - expStats.total_expenses;
    const margin = salesStats.total_revenue > 0
      ? ((salesStats.total_profit / salesStats.total_revenue) * 100).toFixed(2)
      : 0;

    res.json({
      ...salesStats,
      ...expStats,
      ...inventoryStats,
      net_profit,
      margin: parseFloat(margin),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/revenue-over-time?period=month|week
router.get('/revenue-over-time', (req, res) => {
  try {
    const { period = 'month', from, to } = req.query;
    const fmt = period === 'week' ? '%Y-%W' : '%Y-%m';
    let filter = 'WHERE 1=1';
    const params = [];
    if (from) { filter += ' AND s.sale_date >= ?'; params.push(from); }
    if (to)   { filter += ' AND s.sale_date <= ?'; params.push(to); }

    const rows = db.prepare(`
      SELECT
        strftime('${fmt}', s.sale_date) AS period,
        COALESCE(SUM(s.selling_price), 0) AS revenue,
        COALESCE(SUM(s.selling_price - i.purchase_price), 0) AS profit,
        COUNT(*) AS sales_count
      FROM sales s JOIN items i ON s.item_id = i.id
      ${filter}
      GROUP BY period
      ORDER BY period ASC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/category-breakdown
router.get('/category-breakdown', (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = 'WHERE 1=1';
    const params = [];
    if (from) { filter += ' AND s.sale_date >= ?'; params.push(from); }
    if (to)   { filter += ' AND s.sale_date <= ?'; params.push(to); }

    const rows = db.prepare(`
      SELECT
        i.category,
        COUNT(*) AS items_sold,
        COALESCE(SUM(s.selling_price), 0) AS revenue,
        COALESCE(SUM(s.selling_price - i.purchase_price), 0) AS profit,
        COALESCE(AVG(s.selling_price - i.purchase_price), 0) AS avg_profit
      FROM sales s JOIN items i ON s.item_id = i.id
      ${filter}
      GROUP BY i.category
      ORDER BY revenue DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/expenses-breakdown
router.get('/expenses-breakdown', (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = 'WHERE 1=1';
    const params = [];
    if (from) { filter += ' AND expense_date >= ?'; params.push(from); }
    if (to)   { filter += ' AND expense_date <= ?'; params.push(to); }

    const rows = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM expenses ${filter}
      GROUP BY category
      ORDER BY total DESC
    `).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', (req, res) => {
  try {
    const recentSales = db.prepare(`
      SELECT s.id, 'sale' AS type, i.name AS title, s.selling_price AS amount,
             s.sale_date AS date, i.category
      FROM sales s JOIN items i ON s.item_id = i.id
      ORDER BY s.created_at DESC LIMIT 5
    `).all();
    const recentExpenses = db.prepare(`
      SELECT id, 'expense' AS type, COALESCE(notes, category) AS title,
             amount, expense_date AS date, category
      FROM expenses ORDER BY created_at DESC LIMIT 5
    `).all();
    const recentItems = db.prepare(`
      SELECT id, 'item' AS type, name AS title, purchase_price AS amount,
             purchase_date AS date, category
      FROM items ORDER BY created_at DESC LIMIT 5
    `).all();

    const all = [...recentSales, ...recentExpenses, ...recentItems]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
