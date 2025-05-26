const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { auth } = require('../middleware/auth');
const cacheMiddleware = require('../middleware/cache');
const { propertyFilterValidation } = require('../middleware/validation');

router.get('/', propertyFilterValidation, propertyController.advancedFilter);

router.post('/create', auth, propertyController.createProperty);
router.get('/', cacheMiddleware(600), propertyController.getAllProperties);
router.get('/', propertyController.advancedFilter);
router.get('/:id', cacheMiddleware(600), propertyController.getPropertyById);
router.put('/:id', auth, propertyController.updateProperty);
router.delete('/:id', auth, propertyController.deleteProperty);

module.exports = router;
