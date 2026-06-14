-- Smart Food Ordering and Token Generation System Database Schema
-- Target Database: MySQL

CREATE DATABASE IF NOT EXISTS `smart_cafeteria`;
USE `smart_cafeteria`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'admin') DEFAULT 'customer',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_name` VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Food_Items Table
CREATE TABLE IF NOT EXISTS `food_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `image` VARCHAR(500) DEFAULT NULL,
  `category_id` INT,
  `availability` BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `token_number` VARCHAR(50) NOT NULL UNIQUE,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` ENUM('Pending', 'Preparing', 'Ready', 'Completed') DEFAULT 'Pending',
  `order_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Order_Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `food_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `subtotal` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`food_id`) REFERENCES `food_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================================
-- SEED DATA
-- =========================================================================

-- Seed Categories
INSERT INTO `categories` (`id`, `category_name`) VALUES
(1, 'Breakfast'),
(2, 'Main Dishes'),
(3, 'Snacks & Fast Food'),
(4, 'Desserts'),
(5, 'Beverages')
ON DUPLICATE KEY UPDATE `category_name`=VALUES(`category_name`);

-- Seed Users (Bcrypt hashes with 10 salt rounds)
-- Password for admin@cafeteria.com: admin123
-- Password for customer@cafeteria.com: customer123
INSERT INTO `users` (`id`, `full_name`, `email`, `password`, `role`) VALUES
(1, 'System Admin', 'admin@cafeteria.com', '$2a$10$k7Fj11rpC.qo29ipjg9TYO.WZc4grO3di4TNkBtq1ROPtquqGtWyi', 'admin'),
(2, 'John Doe', 'customer@cafeteria.com', '$2a$10$k7Fj11rpC.qo29ipjg9TYOlcovwtbq9bVoj6ousXtCHpEyZtLkSv2', 'customer')
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

-- Seed Food Items
INSERT INTO `food_items` (`id`, `name`, `description`, `price`, `image`, `category_id`, `availability`) VALUES
(1, 'Classic Pancake Combo', 'Three fluffy pancakes topped with butter, served with maple syrup and fresh berries.', 120.00, 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=500&q=80', 1, TRUE),
(2, 'Avocado Smashed Toast', 'Toasted sourdough bread topped with creamy mashed avocado, cherry tomatoes, and red pepper flakes.', 150.00, 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=500&q=80', 1, TRUE),
(3, 'Grilled Chicken Rice Bowl', 'Juicy grilled chicken breast served over brown rice with steamed broccoli, carrots, and sesame sauce.', 220.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80', 2, TRUE),
(4, 'Spicy Beef Burger', 'Grilled beef patty with spicy jalapeño sauce, cheddar cheese, lettuce, and onions in a brioche bun.', 180.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', 3, TRUE),
(5, 'Loaded Cheese Fries', 'Crispy golden fries smothered in warm cheddar cheese sauce, topped with spring onions.', 110.00, 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=500&q=80', 3, TRUE),
(6, 'Chocolate Lava Cake', 'Warm chocolate cake with a molten chocolate center, served with vanilla ice cream.', 140.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', 4, TRUE),
(7, 'Belgian Waffles', 'Freshly baked waffles sprinkled with powdered sugar and drizzled with warm chocolate sauce.', 130.00, 'https://images.unsplash.com/photo-1562376502-6f769499c886?auto=format&fit=crop&w=500&q=80', 4, TRUE),
(8, 'Double Shot Espresso', 'Rich and intense double shot of dark roasted espresso beans.', 80.00, 'https://images.unsplash.com/photo-151097252790b-af4f902673d1?auto=format&fit=crop&w=500&q=80', 5, TRUE),
(9, 'Mango Tango Smoothie', 'Creamy blend of ripe mangoes, yogurt, honey, and fresh mint leaves.', 120.00, 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=500&q=80', 5, TRUE),
(10, 'Iced Peach Lemon Tea', 'Refreshing black tea brewed with peach nectar and a squeeze of fresh lemon, served cold.', 90.00, 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=500&q=80', 5, TRUE)
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `description`=VALUES(`description`), `price`=VALUES(`price`), `image`=VALUES(`image`), `category_id`=VALUES(`category_id`), `availability`=VALUES(`availability`);
