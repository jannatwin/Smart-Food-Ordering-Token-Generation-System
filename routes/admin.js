const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');

// Apply isAdmin middleware to all routes in this router
router.use(isAdmin);

// =========================================================================
// STATISTICS DASHBOARD API
// =========================================================================

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics cards data
router.get('/stats', async (req, res) => {
  try {
    const [statsResult] = await db.query(
      "SELECT COUNT(*)::integer as total_orders, SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END)::integer as pending_orders, SUM(CASE WHEN status = 'Ready' THEN 1 ELSE 0 END)::integer as ready_orders, COALESCE(SUM(total_amount), 0)::numeric as total_revenue FROM orders"
    );

    const stats = statsResult[0] || {};
    return res.json({
      total_orders:   parseInt(stats.total_orders  || 0),
      pending_orders: parseInt(stats.pending_orders || 0),
      ready_orders:   parseInt(stats.ready_orders   || 0),
      total_revenue:  parseFloat(stats.total_revenue || 0)
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ error: 'Server error fetching stats.' });
  }
});

// =========================================================================
// ORDER MANAGEMENT
// =========================================================================

// @route   GET /api/admin/orders
// @desc    Get all orders with items
router.get('/orders', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.id, o.user_id, o.token_number, o.total_amount, o.status, o.order_time,
              u.full_name as customer_name, u.email as customer_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.order_time DESC`
    );

    const ordersWithItems = [];
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.id, oi.order_id, oi.food_id, oi.quantity, oi.subtotal,
                f.name, f.price
         FROM order_items oi
         JOIN food_items f ON oi.food_id = f.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      ordersWithItems.push({ ...order, items });
    }

    return res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    return res.status(500).json({ error: 'Server error fetching orders.' });
  }
});

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status
router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  const validStatuses = ['Pending', 'Preparing', 'Ready', 'Completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    return res.json({ message: `Order status updated to ${status} successfully.` });
  } catch (error) {
    console.error('Error updating order status:', error);
    return res.status(500).json({ error: 'Server error updating order status.' });
  }
});

// =========================================================================
// FOOD ITEM MANAGEMENT (CRUD)
// =========================================================================

// @route   GET /api/admin/foods
// @desc    Get all food items (including categories) for admin panel
router.get('/foods', async (req, res) => {
  try {
    const [foods] = await db.query(
      `SELECT f.id, f.name, f.description, f.price, f.image, f.category_id, f.availability,
              c.category_name
       FROM food_items f
       LEFT JOIN categories c ON f.category_id = c.id`
    );
    return res.json(foods);
  } catch (error) {
    console.error('Error fetching admin foods:', error);
    return res.status(500).json({ error: 'Server error fetching food items.' });
  }
});

// @route   POST /api/admin/foods
// @desc    Add a new food item
router.post('/foods', async (req, res) => {
  const { name, description, price, image, category_id, availability } = req.body;

  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  const isAvailable = availability !== undefined ? (availability ? 1 : 0) : 1;

  try {
    const [result] = await db.query(
      'INSERT INTO food_items (name, description, price, image, category_id, availability) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, parseFloat(price), image || '', parseInt(category_id), isAvailable]
    );

    return res.status(201).json({
      message: 'Food item added successfully.',
      foodId: result.insertId
    });
  } catch (error) {
    console.error('Error adding food item:', error);
    return res.status(500).json({ error: 'Server error adding food item.' });
  }
});

// @route   PUT /api/admin/foods/:id
// @desc    Update an existing food item
router.put('/foods/:id', async (req, res) => {
  const { name, description, price, image, category_id, availability } = req.body;
  const foodId = req.params.id;

  if (!name || !price || !category_id) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  const isAvailable = availability ? 1 : 0;

  try {
    const [result] = await db.query(
      'UPDATE food_items SET name = ?, description = ?, price = ?, image = ?, category_id = ?, availability = ? WHERE id = ?',
      [name, description, parseFloat(price), image || '', parseInt(category_id), isAvailable, foodId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Food item not found.' });
    }

    return res.json({ message: 'Food item updated successfully.' });
  } catch (error) {
    console.error('Error updating food item:', error);
    return res.status(500).json({ error: 'Server error updating food item.' });
  }
});

// @route   DELETE /api/admin/foods/:id
// @desc    Delete a food item
router.delete('/foods/:id', async (req, res) => {
  const foodId = req.params.id;

  try {
    const [result] = await db.query('DELETE FROM food_items WHERE id = ?', [foodId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Food item not found.' });
    }

    return res.json({ message: 'Food item deleted successfully.' });
  } catch (error) {
    console.error('Error deleting food item:', error);
    return res.status(500).json({ error: 'Server error deleting food item.' });
  }
});

// =========================================================================
// CATEGORY MANAGEMENT (CRUD)
// =========================================================================

// @route   GET /api/admin/categories
// @desc    Get all categories for admin panel
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories');
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return res.status(500).json({ error: 'Server error fetching categories.' });
  }
});

// @route   POST /api/admin/categories
// @desc    Create a new category
router.post('/categories', async (req, res) => {
  const { category_name } = req.body;

  if (!category_name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO categories (category_name) VALUES (?)',
      [category_name]
    );

    return res.status(201).json({
      message: 'Category created successfully.',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return res.status(500).json({ error: 'Server error creating category.' });
  }
});

// @route   PUT /api/admin/categories/:id
// @desc    Update a category name
router.put('/categories/:id', async (req, res) => {
  const { category_name } = req.body;
  const catId = req.params.id;

  if (!category_name) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE categories SET category_name = ? WHERE id = ?',
      [category_name, catId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    return res.json({ message: 'Category updated successfully.' });
  } catch (error) {
    console.error('Error updating category:', error);
    return res.status(500).json({ error: 'Server error updating category.' });
  }
});

// @route   DELETE /api/admin/categories/:id
// @desc    Delete a category
router.delete('/categories/:id', async (req, res) => {
  const catId = req.params.id;

  try {
    const [result] = await db.query('DELETE FROM categories WHERE id = ?', [catId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    return res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ error: 'Server error deleting category.' });
  }
});

// =========================================================================
// SALES REPORTS
// =========================================================================

// @route   GET /api/admin/reports/sales
// @desc    Get sales history and reports
router.get('/reports/sales', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.id, o.user_id, o.token_number, o.total_amount, o.status, o.order_time,
              u.full_name as customer_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.order_time DESC`
    );

    const reportData = {
      total_sales: 0,
      total_orders_count: orders.length,
      completed_orders_count: 0,
      cancelled_orders_count: 0,
      status_distribution: { Pending: 0, Preparing: 0, Ready: 0, Completed: 0 },
      orders_list: orders
    };

    orders.forEach(order => {
      reportData.total_sales += parseFloat(order.total_amount);
      if (order.status === 'Completed') reportData.completed_orders_count++;
      if (reportData.status_distribution[order.status] !== undefined) {
        reportData.status_distribution[order.status]++;
      }
    });

    return res.json(reportData);
  } catch (error) {
    console.error('Error compiling sales report:', error);
    return res.status(500).json({ error: 'Server error compiling sales report.' });
  }
});

module.exports = router;
