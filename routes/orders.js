const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAuthenticated } = require('../middleware/auth');

// Helper to generate next unique token (e.g. T001, T002...)
async function generateToken() {
  try {
    const [lastOrders] = await db.query('SELECT token_number FROM orders ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (lastOrders && lastOrders.length > 0) {
      const lastToken = lastOrders[0].token_number; // e.g. "T005"
      if (lastToken && lastToken.startsWith('T')) {
        const lastNum = parseInt(lastToken.substring(1), 10);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
    }
    return 'T' + String(nextNum).padStart(3, '0');
  } catch (error) {
    console.error('Error generating token:', error);
    // Fallback in case of query error
    return 'T' + String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  }
}

// @route   POST /api/orders/place
// @desc    Place a new food order
router.post('/place', isAuthenticated, async (req, res) => {
  const { cart, payment_method, transaction_id } = req.body;
  const userId = req.session.user.id;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty. Cannot place order.' });
  }

  try {
    // 1. Fetch food items to calculate price and check availability
    const [foodItems] = await db.query('SELECT * FROM food_items');
    
    let totalAmount = 0;
    const validatedItems = [];

    for (const cartItem of cart) {
      const food = foodItems.find(f => f.id == cartItem.id);
      if (!food) {
        return res.status(400).json({ error: `Food item with ID ${cartItem.id} not found.` });
      }
      if (!food.availability) {
        return res.status(400).json({ error: `Sorry, ${food.name} is currently unavailable.` });
      }

      const qty = parseInt(cartItem.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for item ${food.name}.` });
      }

      const subtotal = food.price * qty;
      totalAmount += subtotal;

      validatedItems.push({
        food_id: food.id,
        quantity: qty,
        subtotal
      });
    }

    // 2. Generate new token
    const tokenNumber = await generateToken();

    // 3. Save Order inside Database
    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, token_number, total_amount, status) VALUES (?, ?, ?, ?)',
      [userId, tokenNumber, totalAmount, 'Pending']
    );

    const orderId = orderResult.insertId;

    // 4. Save Order Items inside Database
    for (const item of validatedItems) {
      await db.query(
        'INSERT INTO order_items (order_id, food_id, quantity, subtotal) VALUES (?, ?, ?, ?)',
        [orderId, item.food_id, item.quantity, item.subtotal]
      );
    }

    return res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      tokenNumber,
      totalAmount,
      status: 'Pending'
    });

  } catch (error) {
    console.error('Error placing order:', error);
    return res.status(500).json({ error: 'Server error processing order. Please try again.' });
  }
});

// @route   GET /api/orders/my-orders
// @desc    Get order history for the logged-in customer
router.get('/my-orders', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    // Fetch customer's orders sorted by time
    const [orders] = await db.query(
      `SELECT id, user_id, token_number, total_amount, status, order_time
       FROM orders WHERE user_id = ? ORDER BY order_time DESC`,
      [userId]
    );

    // Fetch items for each order
    const ordersWithItems = [];
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.id, oi.order_id, oi.food_id, oi.quantity, oi.subtotal,
                f.name, f.price, f.image
         FROM order_items oi
         JOIN food_items f ON oi.food_id = f.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      ordersWithItems.push({ ...order, items });
    }

    return res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching order history:', error);
    return res.status(500).json({ error: 'Server error fetching order history.' });
  }
});

// @route   GET /api/orders/track/:token
// @desc    Track an order status using its token number
router.get('/track/:token', async (req, res) => {
  const token = req.params.token.trim();

  try {
    // Find order — case-insensitive token match works on both MySQL and PostgreSQL
    const [orders] = await db.query(
      `SELECT o.id, o.user_id, o.token_number, o.total_amount, o.status, o.order_time,
              u.full_name as customer_name
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE UPPER(o.token_number::text) = UPPER(?::text)`,
      [token]
    );

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: `Order with token number ${token} not found.` });
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.query(
      `SELECT oi.id, oi.order_id, oi.food_id, oi.quantity, oi.subtotal,
              f.name, f.price, f.image
       FROM order_items oi
       JOIN food_items f ON oi.food_id = f.id
       WHERE oi.order_id = ?`,
      [order.id]
    );

    return res.json({ order, items });
  } catch (error) {
    console.error('Error tracking order:', error);
    return res.status(500).json({ error: 'Server error tracking order.' });
  }
});

module.exports = router;
