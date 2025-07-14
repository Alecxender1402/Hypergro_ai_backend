const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { auth } = require('../middleware/auth');
const { propertyFilterValidation } = require('../middleware/validation');
const { cache } = require('../middleware/cache');

// Define cache durations in seconds
const CACHE_SHORT = 30;          // 30 seconds for real-time data
const CACHE_MEDIUM = 5 * 60;     // 5 minutes  
const CACHE_LONG = 15 * 60;      // 15 minutes

// Routes with caching
router.get('/', propertyFilterValidation, cache(CACHE_SHORT), propertyController.advancedFilter);
router.post('/create', auth, propertyController.createProperty);
router.get('/all', cache(CACHE_MEDIUM), propertyController.getAllProperties);
router.get('/:id', cache(CACHE_LONG), propertyController.getPropertyById);
router.put('/:id', auth, propertyController.updateProperty);
router.delete('/:id', auth, propertyController.deleteProperty);

module.exports = router;
