const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { auth } = require('../middleware/auth');
const { propertyFilterValidation } = require('../middleware/validation');

router.get('/', propertyFilterValidation, propertyController.advancedFilter);

router.post('/create', auth, propertyController.createProperty);
router.get('/all', propertyController.getAllProperties);
router.get('/:id', propertyController.getPropertyById);
router.put('/:id', auth, propertyController.updateProperty);
router.delete('/:id', auth, propertyController.deleteProperty);

module.exports = router;
