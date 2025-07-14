const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { favoriteValidation } = require('../middleware/validation');
const { auth } = require('../middleware/auth');
const { cache } = require('../middleware/cache');

// CRUD operations with caching
router.post('/', auth, favoriteValidation, favoriteController.createFavorite);
router.get('/', auth, cache(10), favoriteController.getUserFavorites); // Cache for only 10 seconds for immediate updates
router.delete('/:id', auth, favoriteController.deleteFavorite);

module.exports = router;
