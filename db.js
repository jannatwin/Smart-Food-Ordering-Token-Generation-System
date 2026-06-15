/**
 * db.js — Universal database layer
 *
 * Priority order:
 *  1. PostgreSQL / Supabase  — when DATABASE_URL env var is set
 *  2. MySQL                  — when DB_HOST / DB_NAME env vars are set (no DATABASE_URL)
 *  3. In-memory JSON fallback — when neither database is reachable
 *
 * All public queries use MySQL-style ? placeholders. This module converts
 * them to PostgreSQL $1/$2/... style automatically when using pg.
 */

const fs   = require('fs');
const path = require('path');
require('dotenv').config();

const IS_VERCEL   = !!process.env.VERCEL;
const LOCAL_FILE  = path.join(__dirname, 'db_fallback.json');

let pgPool    = null;   // node-postgres pool
let mysqlPool = null;   // mysql2 pool
let dbMode    = 'fallback'; // 'pg' | 'mysql' | 'fallback'

// =========================================================================
// SEED DATA
// =========================================================================
const defaultSeedData = {
  users: [
    { id: 1, full_name: 'System Admin', email: 'admin@cafeteria.com',    password: '$2a$10$d.coHEMR1QNpIu5cUseA/Oi6WE0ZwWKkJpfSsfooTmOZc4iOf2DL6', role: 'admin',    created_at: new Date().toISOString() },
    { id: 2, full_name: 'John Doe',     email: 'customer@cafeteria.com', password: '$2a$10$S4/avjPl/Hx62.TOjPtua.vV1VYuS3yIAR36Z9XJ.OpHzsddwwyiS', role: 'customer', created_at: new Date().toISOString() }
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
    { id: 2,  name: 'Avocado Smashed Toast',     description: 'Toasted sourdough bread topped with creamy mashed avocado, cherry tomatoes, and red pepper flakes.',              price: 150.00, image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=500&q=80', category_id: 1, availability: 1 },
    { id: 3,  name: 'Grilled Chicken Rice Bowl', description: 'Juicy grilled chicken breast served over brown rice with steamed broccoli, carrots, and sesame sauce.',           price: 220.00, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', category_id: 2, availability: 1 },
    { id: 4,  name: 'Spicy Beef Burger',         description: 'Grilled beef patty with spicy jalapeño sauce, cheddar cheese, lettuce, and onions in a brioche bun.',            price: 180.00, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', category_id: 3, availability: 1 },
    { id: 5,  name: 'Loaded Cheese Fries',       description: 'Crispy golden fries smothered in warm cheddar cheese sauce, topped with spring onions.',                          price: 110.00, image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=500&q=80', category_id: 3, availability: 1 },
    { id: 6,  name: 'Chocolate Lava Cake',       description: 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.',                              price: 140.00, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', category_id: 4, availability: 1 },
    { id: 7,  name: 'Belgian Waffles',           description: 'Freshly baked waffles sprinkled with powdered sugar and drizzled with warm chocolate sauce.',                    price: 130.00, image: 'https://images.unsplash.com/photo-1562376502-6f769499c886?auto=format&fit=crop&w=500&q=80', category_id: 4, availability: 1 },
    { id: 8,  name: 'Double Shot Espresso',      description: 'Rich and intense double shot of dark roasted espresso beans.',                                                    price:  80.00, image: 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?auto=format&fit=crop&w=500&q=80', category_id: 5, availability: 1 },
    { id: 9,  name: 'Mango Tango Smoothie',      description: 'Creamy blend of ripe mangoes, yogurt, honey, and fresh mint leaves.',                                            price: 120.00, image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80', category_id: 5, availability: 1 },
    { id: 10, name: 'Iced Peach Lemon Tea',      description: 'Refreshing black tea brewed with peach nectar and a squeeze of fresh lemon, served cold.',                       price:  90.00, image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=500&q=80', category_id: 5, availability: 1 }
  ],
  orders: [],
  order_items: []
};

// =========================================================================
// IN-MEMORY STORE (fallback mode)
// =========================================================================
let memoryStore = null;

function getStore() {
  if (memoryStore) return memoryStore;
  if (!IS_VERCEL && fs.existsSync(LOCAL_FILE)) {
    try {
      memoryStore = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
    } catch (e) {
      memoryStore = JSON.parse(JSON.stringify(defaultSeedData));
    }
  } else {
    memoryStore = JSON.parse(JSON.stringify(defaultSeedData));
    if (!IS_VERCEL) {
      try { fs.writeFileSync(LOCAL_FILE, JSON.stringify(memoryStore, null, 2), 'utf8'); } catch (e) {}
    }
  }
  return memoryStore;
}

function saveStore() {
  if (!IS_VERCEL) {
    try { fs.writeFileSync(LOCAL_FILE, JSON.stringify(memoryStore, null, 2), 'utf8'); } catch (e) {}
  }
}

// =========================================================================
// DATABASE INIT
// =========================================================================
let dbInitPromise = null; // ensures init runs only once per instance

async function initDatabase() {
  // --- Try PostgreSQL / Supabase first (DATABASE_URL takes priority) ---
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require('pg');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required for Supabase
        max: 3,              // keep pool small for serverless
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });
      const client = await pgPool.connect();
      console.log('[PostgreSQL] Connected to Supabase/PostgreSQL successfully.');
      client.release();
      dbMode = 'pg';
      return;
    } catch (err) {
      console.warn('[PostgreSQL] Connection failed:', err.message);
      pgPool = null;
    }
  }

  // --- Try MySQL only if no DATABASE_URL and DB_HOST is explicitly set ---
  if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
    try {
      const mysql = require('mysql2/promise');
      mysqlPool = mysql.createPool({
        host:             process.env.DB_HOST,
        user:             process.env.DB_USER     || 'root',
        password:         process.env.DB_PASSWORD || '',
        database:         process.env.DB_NAME     || 'smart_cafeteria',
        waitForConnections: true,
        connectionLimit:  5,
        queueLimit:       0
      });
      const conn = await mysqlPool.getConnection();
      console.log('[MySQL] Connected to database:', process.env.DB_NAME);
      conn.release();
      dbMode = 'mysql';
      return;
    } catch (err) {
      console.warn('[MySQL] Connection failed:', err.message);
      mysqlPool = null;
    }
  }

  // --- Fallback ---
  console.warn('================================================================');
  console.warn('[DB] No database reachable. Using in-memory JSON fallback.');
  console.warn('[DB] Set DATABASE_URL env var for Supabase/PostgreSQL.');
  console.warn('================================================================');
  dbMode = 'fallback';
  getStore();
}

function ensureDbInit() {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase();
  }
  return dbInitPromise;
}

// =========================================================================
// QUERY WRAPPER
// Converts MySQL ? placeholders → PostgreSQL $1,$2,... automatically
// Returns [rows] for SELECT and [result] for INSERT/UPDATE/DELETE
// matching the mysql2 destructuring pattern used throughout the routes.
// =========================================================================
async function query(sql, params = []) {
  // Always ensure DB is initialized before running any query
  await ensureDbInit();
  if (dbMode === 'pg') {
    // Convert ? → $1, $2, ...
    let i = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++i}`);

    // For INSERT ... RETURNING id we need to add RETURNING
    // We patch the INSERT statements to return the inserted id
    const patchedSql = pgSql
      .replace(/INSERT INTO users\s/i,       'INSERT INTO users ')
      .replace(/INSERT INTO categories\s/i,  'INSERT INTO categories ')
      .replace(/INSERT INTO food_items\s/i,  'INSERT INTO food_items ')
      .replace(/INSERT INTO orders\s/i,      'INSERT INTO orders ')
      .replace(/INSERT INTO order_items\s/i, 'INSERT INTO order_items ');

    const finalSql = /^INSERT/i.test(patchedSql.trim()) && !/RETURNING/i.test(patchedSql)
      ? patchedSql + ' RETURNING id'
      : patchedSql;

    const result = await pgPool.query(finalSql, params);

    // Normalise to match mysql2 return shape
    if (/^INSERT/i.test(finalSql.trim())) {
      const insertId = result.rows[0] ? result.rows[0].id : null;
      return [{ insertId, affectedRows: result.rowCount }];
    }
    if (/^(UPDATE|DELETE)/i.test(finalSql.trim())) {
      return [{ affectedRows: result.rowCount }];
    }
    // SELECT — return [rows]
    return [result.rows];
  }

  if (dbMode === 'mysql') {
    return await mysqlPool.query(sql, params);
  }

  // Fallback
  return runFallbackQuery(sql, params);
}

// =========================================================================
// FALLBACK QUERY ENGINE (in-memory JSON)
// =========================================================================
function runFallbackQuery(sql, params = []) {
  const data = getStore();
  const s = sql.replace(/\s+/g, ' ').trim();

  if (s.match(/select \* from users where email\s*=\s*\?/i))
    return [data.users.filter(u => u.email.toLowerCase() === String(params[0]).toLowerCase())];

  if (s.match(/insert into users/i)) {
    const [full_name, email, password, role] = params;
    const newId = data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) + 1 : 1;
    data.users.push({ id: newId, full_name, email, password, role: role || 'customer', created_at: new Date().toISOString() });
    saveStore();
    return [{ insertId: newId }];
  }

  if (s.match(/select \* from users where id\s*=\s*\?/i))
    return [data.users.filter(u => u.id == params[0])];

  if (s.match(/select \* from categories/i))
    return [data.categories];

  if (s.match(/insert into categories/i)) {
    const newId = data.categories.length > 0 ? Math.max(...data.categories.map(c => c.id)) + 1 : 1;
    data.categories.push({ id: newId, category_name: params[0] });
    saveStore();
    return [{ insertId: newId }];
  }

  if (s.match(/update categories set category_name\s*=\s*\?\s*where id\s*=\s*\?/i)) {
    const cat = data.categories.find(c => c.id == params[1]);
    if (cat) cat.category_name = params[0];
    saveStore();
    return [{ affectedRows: cat ? 1 : 0 }];
  }

  if (s.match(/delete from categories where id\s*=\s*\?/i)) {
    const before = data.categories.length;
    data.categories = data.categories.filter(c => c.id != params[0]);
    data.food_items.forEach(f => { if (f.category_id == params[0]) f.category_id = null; });
    saveStore();
    return [{ affectedRows: before - data.categories.length }];
  }

  if (s.match(/select \* from food_items/i) || s.match(/select f\.\*.*from food_items f/i)) {
    return [data.food_items.map(f => ({ ...f, category_name: (data.categories.find(c => c.id == f.category_id) || {}).category_name || 'Uncategorized' }))];
  }

  if (s.match(/insert into food_items/i)) {
    const [name, description, price, image, category_id, availability] = params;
    const newId = data.food_items.length > 0 ? Math.max(...data.food_items.map(f => f.id)) + 1 : 1;
    data.food_items.push({ id: newId, name, description, price: parseFloat(price), image, category_id: category_id ? parseInt(category_id) : null, availability: availability ? 1 : 0 });
    saveStore();
    return [{ insertId: newId }];
  }

  if (s.match(/update food_items/i)) {
    const [name, description, price, image, category_id, availability, id] = params;
    const food = data.food_items.find(f => f.id == id);
    if (food) { food.name = name; food.description = description; food.price = parseFloat(price); food.image = image; food.category_id = category_id ? parseInt(category_id) : null; food.availability = availability ? 1 : 0; }
    saveStore();
    return [{ affectedRows: food ? 1 : 0 }];
  }

  if (s.match(/delete from food_items where id\s*=\s*\?/i)) {
    const before = data.food_items.length;
    data.food_items = data.food_items.filter(f => f.id != params[0]);
    saveStore();
    return [{ affectedRows: before - data.food_items.length }];
  }

  if (s.match(/insert into orders/i)) {
    const [user_id, token_number, total_amount, status] = params;
    const newId = data.orders.length > 0 ? Math.max(...data.orders.map(o => o.id)) + 1 : 1;
    data.orders.push({ id: newId, user_id: parseInt(user_id), token_number, total_amount: parseFloat(total_amount), status: status || 'Pending', order_time: new Date().toISOString() });
    saveStore();
    return [{ insertId: newId }];
  }

  if (s.match(/insert into order_items/i)) {
    const [order_id, food_id, quantity, subtotal] = params;
    const newId = data.order_items.length > 0 ? Math.max(...data.order_items.map(oi => oi.id)) + 1 : 1;
    data.order_items.push({ id: newId, order_id: parseInt(order_id), food_id: parseInt(food_id), quantity: parseInt(quantity), subtotal: parseFloat(subtotal) });
    saveStore();
    return [{ insertId: newId }];
  }

  if (s.match(/select token_number from orders order by id desc limit 1/i))
    return [[...data.orders].sort((a, b) => b.id - a.id).slice(0, 1).map(o => ({ token_number: o.token_number }))];

  if (s.match(/select \* from orders where user_id\s*=\s*\?/i))
    return [data.orders.filter(o => o.user_id == params[0]).sort((a, b) => new Date(b.order_time) - new Date(a.order_time))];

  if (s.match(/select \* from orders where token_number\s*=\s*\?/i))
    return [data.orders.filter(o => o.token_number.toLowerCase() === String(params[0]).toLowerCase())];

  if (s.match(/select o\.\*, u\.full_name as customer_name from orders o join users u on o\.user_id = u\.id where o\.token_number\s*=\s*\?/i)) {
    const token = String(params[0] || '').toLowerCase();
    return [data.orders.filter(o => String(o.token_number).toLowerCase() === token).map(o => {
      const user = data.users.find(u => u.id == o.user_id);
      return { ...o, customer_name: user ? user.full_name : 'Unknown' };
    })];
  }

  if (s.match(/select \* from orders order by/i) || s.match(/select o\.\*.*from orders o/i)) {
    return [data.orders.map(o => {
      const user = data.users.find(u => u.id == o.user_id);
      return { ...o, full_name: user ? user.full_name : 'Unknown', email: user ? user.email : '', customer_name: user ? user.full_name : 'Unknown', customer_email: user ? user.email : '' };
    }).sort((a, b) => new Date(b.order_time) - new Date(a.order_time))];
  }

  if (s.match(/select oi\.\*.*from order_items oi/i) || s.match(/select \* from order_items/i)) {
    return [data.order_items.filter(oi => oi.order_id == params[0]).map(oi => {
      const food = data.food_items.find(f => f.id == oi.food_id);
      return { ...oi, name: food ? food.name : 'Unknown', price: food ? food.price : 0, image: food ? food.image : '' };
    })];
  }

  if (s.match(/update orders set status\s*=\s*\?\s*where id\s*=\s*\?/i)) {
    const order = data.orders.find(o => o.id == params[1]);
    if (order) order.status = params[0];
    saveStore();
    return [{ affectedRows: order ? 1 : 0 }];
  }

  if (s.match(/select count\(\*\) as/i) || s.match(/sum\(total_amount\)/i)) {
    return [[{
      total_orders:     data.orders.length,
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

// Start DB init immediately on module load
ensureDbInit();

module.exports = { 
  query, 
  getPool: () => pgPool || mysqlPool, 
  isFallback: () => dbMode === 'fallback',
  getDbMode: () => dbMode
};
