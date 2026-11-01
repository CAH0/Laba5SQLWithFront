const express = require('express');
const db = require('../db');

const router = express.Router();

// Валидация товара (до запроса к БД)
function validateProduct(body) {
  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return 'Название должно быть непустой строкой';
  }
  if (typeof body.quantity !== 'number' || !Number.isInteger(body.quantity) || body.quantity < 0) {
    return 'Количество должно быть целым неотрицательным числом';
  }
  if (typeof body.price !== 'number' || body.price < 0) {
    return 'Цена должна быть неотрицательным числом';
  }
  return null;
}

// GET /api/products?page=1 — список с пагинацией и статистикой
router.get('/', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 3;
    const offset = (page - 1) * limit;

    // Получаем товары для текущей страницы
    const [rows] = await db.query(
      'SELECT * FROM products ORDER BY id LIMIT ? OFFSET ?',
      [limit, offset]
    );

    // Статистика по всей таблице
    const [stats] = await db.query(
      'SELECT COUNT(*) AS totalPositions, COALESCE(SUM(quantity * price), 0) AS totalValue FROM products'
    );
    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM products');
    const total = countRows[0].total;

    res.status(200).json({
      items: rows,
      page,
      totalPages: Math.ceil(total / limit),
      totalPositions: stats[0].totalPositions,
      totalValue: Number(stats[0].totalValue),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/products/:id — один товар
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/products — создание
router.post('/', async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const { name, quantity, price } = req.body;
    const [result] = await db.query(
      'INSERT INTO products (name, quantity, price) VALUES (?, ?, ?)',
      [name.trim(), quantity, price]
    );
    res.status(201).json({
      id: result.insertId,
      name: name.trim(),
      quantity,
      price,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/products/:id — обновление
router.put('/:id', async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const { name, quantity, price } = req.body;
    const [result] = await db.query(
      'UPDATE products SET name = ?, quantity = ?, price = ? WHERE id = ?',
      [name.trim(), quantity, price, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json({ id: Number(req.params.id), name: name.trim(), quantity, price });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/products/:id — удаление
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.status(200).json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;