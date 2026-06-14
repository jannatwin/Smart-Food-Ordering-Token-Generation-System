-- =========================================================================
-- Smart Food Ordering & Token Generation System
-- PostgreSQL Schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  full_name  VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(20)  NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id            SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL UNIQUE
);

-- 3. Food Items Table
CREATE TABLE IF NOT EXISTS food_items (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255)   NOT NULL,
  description  TEXT           DEFAULT NULL,
  price        NUMERIC(10,2)  NOT NULL,
  image        VARCHAR(500)   DEFAULT NULL,
  category_id  INT            REFERENCES categories(id) ON DELETE SET NULL,
  availability BOOLEAN        DEFAULT TRUE
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL PRIMARY KEY,
  user_id      INT            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_number VARCHAR(50)    NOT NULL UNIQUE,
  total_amount NUMERIC(10,2)  NOT NULL,
  status       VARCHAR(20)    NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Preparing','Ready','Completed')),
  order_time   TIMESTAMPTZ    DEFAULT NOW()
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id        SERIAL PRIMARY KEY,
  order_id  INT           NOT NULL REFERENCES orders(id)     ON DELETE CASCADE,
  food_id   INT           NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  quantity  INT           NOT NULL DEFAULT 1,
  subtotal  NUMERIC(10,2) NOT NULL
);

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Categories
INSERT INTO categories (id, category_name) VALUES
(1, 'Breakfast'),
(2, 'Main Dishes'),
(3, 'Snacks & Fast Food'),
(4, 'Desserts'),
(5, 'Beverages')
ON CONFLICT (id) DO UPDATE SET category_name = EXCLUDED.category_name;

-- Reset sequence after manual ID inserts
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- Users
-- admin@cafeteria.com     → Caf3Admin@2025!
-- customer@cafeteria.com  → customer123
INSERT INTO users (id, full_name, email, password, role) VALUES
(1, 'System Admin', 'admin@cafeteria.com',    '$2a$10$d.coHEMR1QNpIu5cUseA/Oi6WE0ZwWKkJpfSsfooTmOZc4iOf2DL6', 'admin'),
(2, 'John Doe',     'customer@cafeteria.com', '$2a$10$S4/avjPl/Hx62.TOjPtua.vV1VYuS3yIAR36Z9XJ.OpHzsddwwyiS', 'customer')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Food Items
INSERT INTO food_items (id, name, description, price, image, category_id, availability) VALUES
(1,  'Classic Pancake Combo',    'Three fluffy pancakes topped with butter, served with maple syrup and fresh berries.',                             120.00, 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=500&q=80', 1, TRUE),
(2,  'Avocado Smashed Toast',    'Toasted sourdough bread topped with creamy mashed avocado, cherry tomatoes, and red pepper flakes.',              150.00, 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=500&q=80', 1, TRUE),
(3,  'Grilled Chicken Rice Bowl','Juicy grilled chicken breast served over brown rice with steamed broccoli, carrots, and sesame sauce.',           220.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', 2, TRUE),
(4,  'Spicy Beef Burger',        'Grilled beef patty with spicy jalapeño sauce, cheddar cheese, lettuce, and onions in a brioche bun.',            180.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', 3, TRUE),
(5,  'Loaded Cheese Fries',      'Crispy golden fries smothered in warm cheddar cheese sauce, topped with spring onions.',                          110.00, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=500&q=80', 3, TRUE),
(6,  'Chocolate Lava Cake',      'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.',                              140.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', 4, TRUE),
(7,  'Belgian Waffles',          'Freshly baked waffles sprinkled with powdered sugar and drizzled with warm chocolate sauce.',                     130.00, 'https://images.unsplash.com/photo-1562376502-6f769499c886?auto=format&fit=crop&w=500&q=80', 4, TRUE),
(8,  'Double Shot Espresso',     'Rich and intense double shot of dark roasted espresso beans.',                                                     80.00, 'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1?auto=format&fit=crop&w=500&q=80', 5, TRUE),
(9,  'Mango Tango Smoothie',     'Creamy blend of ripe mangoes, yogurt, honey, and fresh mint leaves.',                                            120.00, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80', 5, TRUE),
(10, 'Iced Peach Lemon Tea',     'Refreshing black tea brewed with peach nectar and a squeeze of fresh lemon, served cold.',                        90.00, 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=500&q=80', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  price        = EXCLUDED.price,
  image        = EXCLUDED.image,
  category_id  = EXCLUDED.category_id,
  availability = EXCLUDED.availability;

SELECT setval('food_items_id_seq', (SELECT MAX(id) FROM food_items));
