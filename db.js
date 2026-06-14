const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const IS_VERCEL = !!process.env.VERCEL;
const LOCAL_FILE = path.join(__dirname, 'db_fallback.json');

let pool = null;
let useFallback = false;

// =========================================================================
// SEED DATA — used as the initial state for the in-memory / file fallback
// =========================================================================
const defaultSeedData = {
  users: [
    { id: 1, full_name: 'System Admin', email: 'admin@cafeteria.com', password: '$2a$10$L6IYqTO1fFSMvZu6se5pK.BAhRRxgwxzrU2nmeeTh2S4rYiAkA3BC', role: 'admin', created_at: new Date().toISOString() },
    { id: 2, full_name: 'John Doe', email: 'customer@cafeteria.com', password: '$2a$10$k7Fj11rpC.qo29ipjg9TYOlcovwtbq9bVoj6ousXtCHpEyZtLkSv2', role: 'customer', created_at: new Date().toISOString() }
  ],
  categories: [
    { id: 1, category_name: 'Breakfast' },
    { id: 2, category_name: 'Main Dishes' },
    { id: 3, category_name: 'Snacks & Fast Food' },
    { id: 4, category_name: 'Desserts' },
    { id: 5, category_name: 'Beverages' }
  ],
  food_items: [
    { id: 1,  name: 'Classic Pancake Combo',    description: 'Three fluffy pancakes topped with butter, served with maple syrup and fresh berries.',                              price: 120.00, image: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=500&q=80', category_id: 1, availability: 1 },
    { id: 2,  name: 'Avocado Smashed Toast',     description: 'Toasted sourdough bread topped with creamy mashed avocado, cherry tomatoes, and red pepper flakes.',             price: 150.00, image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=500&q=80', category_id: 1, availability: 1 },
    { id: 3,  name: 'Grilled Chicken Rice Bowl', description: 'Juicy grilled chicken breast served over brown rice with steamed broccoli, carrots, and sesame sauce.',          price: 220.00, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', category_id: 2, availability: 1 },
    { id: 4,  name: 'Spicy Beef Burger',         description: 'Grilled beef patty with spicy jalapeño sauce, cheddar cheese, lettuce, and onions in a brioche bun.',           price: 180.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', category_id: 3, availability: 1 },
    { id: 5,  name: 'Loaded Cheese Fries',       description: 'Crispy golden fries smothered in warm cheddar cheese sauce, topped with spring onions.',                         price: 110.00, image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=500&q=80', category_id: 3, availability: 1 },
    { id: 6,  name: 'Chocolate Lava Cake',       description: 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.',                             price: 140.00, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', category_id: 4, availability: 1 },
    { id: 7,  name: 'Belgian Waffles',           description: 'Freshly baked waffles sprinkled with powdered sugar and drizzled with warm chocolate sauce.',                   price: 130.00, image: 'https://images.unsplash.com/photo-1562376502-6f769499c886?auto=format&fit=crop&w=500&q=80', category_id: 4, availability: 1 },
    { id: 8,  name: 'Double Shot Espresso',      description: 'Rich and intense double shot of dark roasted espresso beans.',                                                   price:  80.00, image: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?auto=format&fit=crop&w=500&q=80', category_id: 5, availability: 1 },
    { id: 9,  name: 'Mango Tango Smoothie',      description: 'Creamy blend of ripe mangoes, yogurt, honey, and fresh mint leaves.',                                           price: 120.00, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80', category_id: 5, availability: 1 },
    { id: 10, name: 'Iced Peach Lemon Tea',      description: 'Refreshing black tea brewed with peach nectar and a squeeze of fresh lemon, served cold.',                      price:  90.00, image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=500&q=80', category_id: 5, availability: 1 }
  ],
  orders: [],
  order_items: []
};

// =========================================================================
// IN-MEMORY STORE — the single source of truth when using fallback
// On Vercel: initialized from defaultSeedData (no filesystem write)
// Locally:   loaded from db_fallback.json and written back on every change
// =========================================================================
let memoryStore = null;

function getStore() {
  if (memoryStore) return memoryStore;

  // First access — load from local file if available, else use seed
  if (!IS_VERCEL && fs.existsSync(LOCAL_FILE)) {
    try {
      memoryStore = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
      console.log('[Fallback DB] Loaded from local file:', LOCAL_FILE);
    } catch (e) {
      console.warn('[Fallback DB] Could not parse local file, using seed data.');
      memoryStore = JSON.parse(JSON.stringify(defaultSeedData));
    }
  } else {
    memoryStore = JSON.parse(JSON.stringify(defaultSeedData));
    if (!IS_VERCEL) {
      // Write seed to disk for local dev
      try {
        fs.writeFileSync(LOCAL_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
        console.log('[Fallback DB] Initialized local file:', LOCAL_FILE);
      } catch (e) {
        console.warn('[Fallback DB] Could not write local file:', e.message);
      }
    }
  }
  return memoryStore;
}

function saveStore() {
  // Persist to disk only when running locally
  if (!IS_VERCEL) {
    try {
      fs.writeFileSync(LOCAL_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Fallback DB] Could not persist to disk:', e.message);
    }
  }
  // On Vercel: memoryStore is already updated in-memory — that's enough for the request lifecycle
}

// =========================================================================
// MySQL pool setup
// =========================================================================
async function initDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'smart_cafeteria',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const connection = await pool.getConnection();
    console.log('[MySQL] Connected successfully to database:', process.env.DB_NAME);
    connection.release();
  } catch (error) {
    console.warn('\n================================================================');
    console.warn('[WARNING] MySQL connection failed:', error.message);
    console.warn('[STATUS] Activating in-memory JSON fallback...');
    console.warn('All features will remain fully functional!');
    console.warn('================================================================\n');
    useFallback = true;
    getStore(); // Initialize the store immediately
  }
}

// =========================================================================
// FALLBACK QUERY ENGINE
// =========================================================================
function runFallbackQuery(sql, params = []) {
  const data = getStore();
  const s = sql.replace(/\s+/g, ' ').trim();

  // 1. SELECT * FROM users WHERE email = ?
  if (s.match(/select \* from users where email\s*=\s*\?/i)) {
    return [data.users.filter(u => u.email.toLowerCase() === String(params[0]).toLowerCase())];
  }

  // 2. INSERT INTO users
  if (s.match(/insert into users/i)) {
    const [full_name, email, password, role] = params;
    const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    const newUser = { id: newId, full_name, email, password, role: role || 'customer', created_at: new Date().toISOString() };
    data.users.push(newUser);
    saveStore();
    return [{ insertId: newId }];
  }

  // 3. SELECT * FROM users WHERE id = ?
  if (s.match(/select \* from users where id\s*=\s*\?/i)) {
    return [data.users.filter(u => u.id == params[0])];
  }

  // 4. SELECT * FROM categories
  if (s.match(/select \* from categories/i)) {
    return [data.categories];
  }

  // 5. INSERT INTO categories
  if (s.match(/insert into categories/i)) {
    const [category_name] = params;
    const newId = data.categories.length > 0 ? Math.max(...data.categories.map(c => c.id)) + 1 : 1;
    data.categories.push({ id: newId, category_name });
    saveStore();
    return [{ insertId: newId }];
  }

  // 6. UPDATE categories SET category_name = ? WHERE id = ?
  if (s.match(/update categories set category_name\s*=\s*\?\s*where id\s*=\s*\?/i)) {
    const [category_name, id] = params;
    const cat = data.categories.find(c => c.id == id);
    if (cat) cat.category_name = category_name;
    saveStore();
    return [{ affectedRows: cat ? 1 : 0 }];
  }

  // 7. DELETE FROM categories WHERE id = ?
  if (s.match(/delete from categories where id\s*=\s*\?/i)) {
    const id = params[0];
    const before = data.categories.length;
    data.categories = data.categories.filter(c => c.id != id);
    data.food_items.forEach(f => { if (f.category_id == id) f.category_id = null; });
    saveStore();
    return [{ affectedRows: before - data.categories.length }];
  }

  // 8. SELECT food items (all variants)
  if (s.match(/select \* from food_items/i) || s.match(/select f\.\*.*from food_items f/i)) {
    const rows = data.food_items.map(f => {
      const cat = data.categories.find(c => c.id == f.category_id);
      return { ...f, category_name: cat ? cat.category_name : 'Uncategorized' };
    });
    return [rows];
  }

  // 9. INSERT INTO food_items
  if (s.match(/insert into food_items/i)) {
    const [name, description, price, image, category_id, availability] = params;
    const newId = data.food_items.length > 0 ? Math.max(...data.food_items.map(f => f.id)) + 1 : 1;
    data.food_items.push({ id: newId, name, description, price: parseFloat(price), image, category_id: category_id ? parseInt(category_id) : null, availability: availability ? 1 : 0 });
    saveStore();
    return [{ insertId: newId }];
  }

  // 10. UPDATE food_items
  if (s.match(/update food_items/i)) {
    const [name, description, price, image, category_id, availability, id] = params;
    const food = data.food_items.find(f => f.id == id);
    if (food) { food.name = name; food.description = description; food.price = parseFloat(price); food.image = image; food.category_id = category_id ? parseInt(category_id) : null; food.availability = availability ? 1 : 0; }
    saveStore();
    return [{ affectedRows: food ? 1 : 0 }];
  }

  // 11. DELETE FROM food_items WHERE id = ?
  if (s.match(/delete from food_items where id\s*=\s*\?/i)) {
    const before = data.food_items.length;
    data.food_items = data.food_items.filter(f => f.id != params[0]);
    saveStore();
    return [{ affectedRows: before - data.food_items.length }];
  }

  // 12. INSERT INTO orders
  if (s.match(/insert into orders/i)) {
    const [user_id, token_number, total_amount, status] = params;
    const newId = data.orders.length > 0 ? Math.max(...data.orders.map(o => o.id)) + 1 : 1;
    data.orders.push({ id: newId, user_id: parseInt(user_id), token_number, total_amount: parseFloat(total_amount), status: status || 'Pending', order_time: new Date().toISOString() });
    saveStore();
    return [{ insertId: newId }];
  }

  // 13. INSERT INTO order_items
  if (s.match(/insert into order_items/i)) {
    const [order_id, food_id, quantity, subtotal] = params;
    const newId = data.order_items.length > 0 ? Math.max(...data.order_items.map(oi => oi.id)) + 1 : 1;
    data.order_items.push({ id: newId, order_id: parseInt(order_id), food_id: parseInt(food_id), quantity: parseInt(quantity), subtotal: parseFloat(subtotal) });
    saveStore();
    return [{ insertId: newId }];
  }

  // 14. SELECT token_number FROM orders ORDER BY id DESC LIMIT 1
  if (s.match(/select token_number from orders order by id desc limit 1/i)) {
    const rows = [...data.orders].sort((a, b) => b.id - a.id).slice(0, 1).map(o => ({ token_number: o.token_number }));
    return [rows];
  }

  // 15. SELECT * FROM orders WHERE user_id = ?
  if (s.match(/select \* from orders where user_id\s*=\s*\?/i)) {
    return [data.orders.filter(o => o.user_id == params[0]).sort((a, b) => new Date(b.order_time) - new Date(a.order_time))];
  }

  // 16. SELECT * FROM orders WHERE token_number = ?
  if (s.match(/select \* from orders where token_number\s*=\s*\?/i)) {
    return [data.orders.filter(o => o.token_number.toLowerCase() === String(params[0]).toLowerCase())];
  }

  // 17. Track by token — join with user
  if (s.match(/select o\.\*, u\.full_name as customer_name from orders o join users u on o\.user_id = u\.id where o\.token_number\s*=\s*\?/i)) {
    const token = String(params[0] || '').toLowerCase();
    const rows = data.orders.filter(o => String(o.token_number).toLowerCase() === token).map(o => {
      const user = data.users.find(u => u.id == o.user_id);
      return { ...o, customer_name: user ? user.full_name : 'Unknown Customer' };
    });
    return [rows];
  }

  // 18. SELECT all orders (admin / report join)
  if (s.match(/select \* from orders order by/i) || s.match(/select o\.\*.*from orders o/i)) {
    const rows = data.orders.map(o => {
      const user = data.users.find(u => u.id == o.user_id);
      return { ...o, full_name: user ? user.full_name : 'Unknown', email: user ? user.email : '', customer_name: user ? user.full_name : 'Unknown', customer_email: user ? user.email : '' };
    }).sort((a, b) => new Date(b.order_time) - new Date(a.order_time));
    return [rows];
  }

  // 19. SELECT order_items
  if (s.match(/select oi\.\*.*from order_items oi/i) || s.match(/select \* from order_items/i)) {
    const orderId = params[0];
    const rows = data.order_items.filter(oi => oi.order_id == orderId).map(oi => {
      const food = data.food_items.find(f => f.id == oi.food_id);
      return { ...oi, name: food ? food.name : 'Unknown', price: food ? food.price : 0, image: food ? food.image : '' };
    });
    return [rows];
  }

  // 20. UPDATE orders SET status
  if (s.match(/update orders set status\s*=\s*\?\s*where id\s*=\s*\?/i)) {
    const [status, id] = params;
    const order = data.orders.find(o => o.id == id);
    if (order) order.status = status;
    saveStore();
    return [{ affectedRows: order ? 1 : 0 }];
  }

  // 21. Stats query
  if (s.match(/select count\(\*\) as/i) || s.match(/sum\(total_amount\)/i)) {
    return [[{
      total_orders: data.orders.length,
      pending_orders:   data.orders.filter(o => o.status === 'Pending').length,
      preparing_orders: data.orders.filter(o => o.status === 'Preparing').length,
      ready_orders:     data.orders.filter(o => o.status === 'Ready').length,
      completed_orders: data.orders.filter(o => o.status === 'Completed').length,
      total_revenue:    data.orders.reduce((sum, o) => sum + o.total_amount, 0)
    }]];
  }

  console.warn('[Fallback DB] Unmatched query:', sql);
  return [[]];
}

// =========================================================================
// Public query wrapper
// =========================================================================
async function query(sql, params = []) {
  if (useFallback) {
    return runFallbackQuery(sql, params);
  }
  try {
    return await pool.query(sql, params);
  } catch (error) {
    console.error('[DB Pool Error]', error.message);
    throw error;
  }
}

initDatabase();

module.exports = { query, getPool: () => pool, isFallback: () => useFallback };
