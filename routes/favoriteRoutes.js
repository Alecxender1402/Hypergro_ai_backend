const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { favoriteValidation } = require('../middleware/validation');
const { auth } = require('../middleware/auth');

// CRUD operations
router.post('/', auth, favoriteValidation,favoriteController.createFavorite);
router.get('/', auth, favoriteController.getUserFavorites);
router.delete('/:id', auth, favoriteController.deleteFavorite);

module.exports = router;
