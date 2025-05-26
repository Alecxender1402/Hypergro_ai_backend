// middleware/validation.js
const { query, body} = require('express-validator');

exports.propertyFilterValidation = [
  query('price.*').optional().isNumeric(),
  query('bedrooms.*').optional().isInt({ min: 1 }),
  query('bathrooms.*').optional().isFloat({ min: 1 }),
  query('rating.*').optional().isFloat({ min: 0, max: 5 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().matches(/^-?[a-zA-Z,]+$/),
  query('fields').optional().matches(/^[a-zA-Z,]+$/)
];

exports.favoriteValidation = [
    body('propertyId')
      .notEmpty()
      .withMessage('Property ID is required')
      .isMongoId()
      .withMessage('Invalid property ID')
  ];
