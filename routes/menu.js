const express = require('express');
const router = express.Router();
const db = require('../db');

// @route   GET /api/menu/categories
// @desc    Get all food categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories');
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({ error: 'Server error fetching categories.' });
  }
});

// @route   GET /api/menu/items
// @desc    Get all food items (supports optional search and category filters)
router.get('/items', async (req, res) => {
  const { category_id, search } = req.query;

  try {
    // Basic join query. Fallback DB mimics this structure.
    const [items] = await db.query(
      'SELECT f.*, c.category_name FROM food_items f LEFT JOIN categories c ON f.category_id = c.id WHERE f.availability = true OR f.availability::integer = 1'
    );

    let filteredItems = items;

    // Filter by Category
    if (category_id) {
      filteredItems = filteredItems.filter(item => item.category_id == category_id);
    }

    // Filter by Search Query
    if (search) {
      const queryStr = search.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.name.toLowerCase().includes(queryStr) || 
        (item.description && item.description.toLowerCase().includes(queryStr))
      );
    }

    return res.json(filteredItems);
  } catch (error) {
    console.error('Error fetching food items:', error);
    return res.status(500).json({ error: 'Server error fetching food items.' });
  }
});

module.exports = router;
