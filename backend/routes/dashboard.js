const express = require('express');
const { db } = require('../database/db');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    let dateFilter = 'WHERE 1=1';
    const params = [];
    if (from) { dateFilter += ' AND sale_date >= ?'; params.push(from); }
    if (to)   { dateFilter += ' AND sale_date <= ?'; params.push(to); }

    const salesStats = (await db.execute({
      sql: `SELECT
        COALESCE(SUM(s.selling_price), 0) AS total_revenue,
        COALESCE(SUM(s.selling_price - i.purchase_price), 0) AS total_profit,
        COUNT(*) AS total_sold,
        COALESCE(AVG(s.selling_price - i.purchase_price), 0) AS avg_profit_per_item,
        COALESCE(SUM(i.purchase_price), 0) AS total_cogs
      FROM sales s JOIN items i ON s.item_id = i.id ${dateFilter}`,
      args: params,
    })).rows[0];

    let expFilter = 'WHERE 1=1';
    const expParams = [];
    if (from) { expFilter += ' AND expense_date >= ?'; expParams.push(from); }
    if (to)   { expFilter += ' AND expense_date <= ?'; expParams.push(to); }
    const expStats = (await db.execute({
      sql: `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM expenses ${expFilter}`,
      args: expParams,
    })).rows[0];

    const inventoryStats = (await db.execute(`
      SELECT
        COUNT(*) AS total_items,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN status = 'reserved'  THEN 1 ELSE 0 END) AS reserved,
        SUM(CASE WHEN status = 'sold'      THEN 1 ELSE 0 END) AS sold,
        COALESCE(SUM(CASE WHEN status IN ('available','reserved') THEN purchase_price END), 0) AS inventory_value
      FROM items
    `)).rows[0];

    const net_profit = salesStats.total_profit - expStats.total_expenses;
    const margin = salesStats.total_revenue > 0
      ? ((salesStats.total_profit / salesStats.total_revenue) * 100).toFixed(2)
      : 0;

    res.json({ ...salesStats, ...expStats, ...inventoryStats, net_profit, margin: parseFloat(margin) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/revenue-over-time
router.get('/revenue-over-time', async (req, res) => {
  try {
    const { period = 'month', from, to } = req.query;
    const fmt = period === 'week' ? '%Y-%W' : '%Y-%m';
    let filter = 'WHERE 1=1';
    const args = [];
    if (from) { filter += ' AND s.sale_date >= ?'; args.push(from); }
    if (to)   { filter += ' AND s.sale_date <= ?'; args.push(to); }

    const result = await db.execute({
      sql: `SELECT
        strftime('${fmt}', s.sale_date) AS period,
        COALESCE(SUM(s.selling_price), 0) AS revenue,
        COALESCE(SUM(s.selling_price - i.purchase_price), 0) AS profit,
        COUNT(*) AS sales_count
      FROM sales s JOIN items i ON s.item_id = i.id
      ${filter}
      GROUP BY period ORDER BY period ASC`,
      args,
    });
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/category-breakdown
router.get('/category-breakdown', async (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = 'WHERE 1=1';
    const args = [];
    if (from) { filter += ' AND s.sale_date >= ?'; args.push(from); }
    if (to)   { filter += ' AND s.sale_date <= ?'; args.push(to); }

    const result = await db.execute({
      sql: `SELECT
        i.category,
        COUNT(*) AS items_sold,
        COALESCE(SUM(s.selling_price), 0) AS revenue,
        COALESCE(SUM(s.selling_price - i.purchase_price), 0) AS profit,
        COALESCE(AVG(s.selling_price - i.purchase_price), 0) AS avg_profit
      FROM sales s JOIN items i ON s.item_id = i.id
      ${filter}
      GROUP BY i.category ORDER BY revenue DESC`,
      args,
    });
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/expenses-breakdown
router.get('/expenses-breakdown', async (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = 'WHERE 1=1';
    const args = [];
    if (from) { filter += ' AND expense_date >= ?'; args.push(from); }
    if (to)   { filter += ' AND expense_date <= ?'; args.push(to); }

    const result = await db.execute({
      sql: `SELECT category, COALESCE(SUM(amount), 0) AS total
            FROM expenses ${filter} GROUP BY category ORDER BY total DESC`,
      args,
    });
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req, res) => {
  try {
    const [salesRes, expRes, itemsRes] = await Promise.all([
      db.execute(`SELECT s.id, 'sale' AS type, i.name AS title, s.selling_price AS amount,
                         s.sale_date AS date, i.category
                  FROM sales s JOIN items i ON s.item_id = i.id
                  ORDER BY s.created_at DESC LIMIT 5`),
      db.execute(`SELECT id, 'expense' AS type, COALESCE(notes, category) AS title,
                         amount, expense_date AS date, category
                  FROM expenses ORDER BY created_at DESC LIMIT 5`),
      db.execute(`SELECT id, 'item' AS type, name AS title, purchase_price AS amount,
                         purchase_date AS date, category
                  FROM items ORDER BY created_at DESC LIMIT 5`),
    ]);

    const all = [...salesRes.rows, ...expRes.rows, ...itemsRes.rows]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
    res.json(all);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
