const { body, validationResult } = require('express-validator');
const Property = require('../models/Property');
const redis = require('../config/redis');

// Validation rules for create and update
exports.propertyValidationRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title must be at most 100 characters'),

  body('type')
    .trim()
    .notEmpty().withMessage('Type is required')
    .isString().withMessage('Type must be a string'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ gt: 0 }).withMessage('Price must be a positive number')
    .toFloat(),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isString().withMessage('State must be a string'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isString().withMessage('City must be a string'),

  body('areaSqFt')
    .notEmpty().withMessage('Area (sqFt) is required')
    .isFloat({ gt: 0 }).withMessage('Area must be a positive number')
    .toFloat(),

  body('bedrooms')
    .notEmpty().withMessage('Bedrooms is required')
    .isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer')
    .toInt(),

  body('bathrooms')
    .notEmpty().withMessage('Bathrooms is required')
    .isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer')
    .toInt(),

  body('amenities')
    .optional()
    .isArray().withMessage('Amenities must be an array of strings'),

  body('amenities.*')
    .optional()
    .isString().withMessage('Each amenity must be a string'),

  body('furnished')
    .optional()
    .isString().withMessage('Furnished must be a string'),

  body('availableFrom')
    .optional()
    .isISO8601().withMessage('AvailableFrom must be a valid date')
    .toDate(),

  body('listedBy')
    .optional()
    .isString().withMessage('ListedBy must be a string'),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array of strings'),

  body('tags.*')
    .optional()
    .isString().withMessage('Each tag must be a string'),

  body('colorTheme')
    .optional()
    .isString().withMessage('ColorTheme must be a string'),

  body('rating')
    .optional()
    .isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5')
    .toFloat(),

  body('isVerified')
    .optional()
    .isBoolean().withMessage('isVerified must be a boolean')
    .toBoolean(),

  body('listingType')
    .notEmpty().withMessage('ListingType is required')
    .isIn(['rent', 'sale']).withMessage('ListingType must be either rent or sale'),
];

const invalidateCache = async (patterns) => {
    try {
      const keys = await redis.keys(`cache:${patterns}*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (err) {
      console.error('Cache invalidation error:', err)
    }
  }
// Helper to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

// CREATE
exports.createProperty = [
  ...exports.propertyValidationRules,
  async (req, res) => {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    try {
      const property = new Property({ ...req.body, createdBy: req.user.id });
      await property.save();
      res.status(201).json(property);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
];

// READ ALL
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.find();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateProperty = [
  ...exports.propertyValidationRules,
  async (req, res) => {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    try {
        const property = await Property.findById(req.params.id);
        if (!property) {
          return res.status(404).json({ error: 'Property not found' });
        }
        // Check ownership
        if (property.createdBy.toString() !== req.user.id) {
          return res.status(403).json({ error: 'Unauthorized: not the property owner' });
        }

        await invalidateCache([
            `/properties/${req.params.id}`,
            '/properties'
          ])
          
        Object.assign(property, req.body);
        await property.save();
        res.json(property);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
  }
];

// DELETE
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    if (property.createdBy.toString() !== req.user.id)
      return res.status(403).json({ error: 'Unauthorized: not the property owner' });

    await property.remove();
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.advancedFilter = async (req, res) => {
    try {
      // 1. Filtering
      const queryObj = { ...req.query };
      const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
      excludedFields.forEach(el => delete queryObj[el]);
  
      // 2. Advanced Filtering
      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
      
      let filter = JSON.parse(queryStr);
  
      // 3. Text Search
      if (req.query.search) {
        filter.$or = [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } },
          { 'address.street': { $regex: req.query.search, $options: 'i' } }
        ];
      }
  
      // 4. Array Filters
      ['amenities', 'tags'].forEach(field => {
        if (req.query[field]) {
          filter[field] = { $all: req.query[field].split(',') };
        }
      });
  
      // 5. Date Filtering
      if (req.query.availableFrom) {
        filter.availableFrom = {
          $gte: new Date(req.query.availableFrom)
        };
      }
  
      // 6. Build Query
      let query = Property.find(filter);
  
      // 7. Sorting
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt');
      }
  
      // 8. Field Limiting
      if (req.query.fields) {
        const fields = req.query.fields.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v');
      }
  
      // 9. Pagination
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 100;
      const skip = (page - 1) * limit;
  
      query = query.skip(skip).limit(limit);
  
      // 10. Execute Query
      const properties = await query;
      const total = await Property.countDocuments(filter);
  
      res.status(200).json({
        status: 'success',
        results: properties.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: properties
      });
  
    } catch (err) {
      res.status(400).json({
        status: 'fail',
        message: err.message
      });
    }
  };
