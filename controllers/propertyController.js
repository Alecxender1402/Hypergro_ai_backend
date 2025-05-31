const Property = require("../models/Property");
const { body, validationResult } = require("express-validator");
// Cache middleware is now a no-op
const { cache, invalidateCache } = require("../middleware/cache");
const mongoose = require("mongoose");

// Helper to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

// Property validation rules
exports.propertyValidationRules = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 100 })
    .withMessage("Title must be at most 100 characters"),

  body("type")
    .trim()
    .notEmpty()
    .withMessage("Type is required")
    .isString()
    .withMessage("Type must be a string"),

  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number")
    .toFloat(),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string"),

  body("city")
    .trim()
    .notEmpty()
    .withMessage("City is required")
    .isString()
    .withMessage("City must be a string"),

  body("areaSqFt")
    .notEmpty()
    .withMessage("Area (sqFt) is required")
    .isFloat({ gt: 0 })
    .withMessage("Area must be a positive number")
    .toFloat(),

  body("bedrooms")
    .notEmpty()
    .withMessage("Bedrooms is required")
    .isInt({ min: 0 })
    .withMessage("Bedrooms must be a non-negative integer")
    .toInt(),

  body("bathrooms")
    .notEmpty()
    .withMessage("Bathrooms is required")
    .isInt({ min: 0 })
    .withMessage("Bathrooms must be a non-negative integer")
    .toInt(),

  body("amenities")
    .optional()
    .isArray()
    .withMessage("Amenities must be an array of strings"),

  body("amenities.*")
    .optional()
    .isString()
    .withMessage("Each amenity must be a string"),

  body("furnished")
    .optional()
    .isString()
    .withMessage("Furnished must be a string"),

  body("availableFrom")
    .optional()
    .isISO8601()
    .withMessage("AvailableFrom must be a valid date")
    .toDate(),

  body("listedBy")
    .optional()
    .isString()
    .withMessage("ListedBy must be a string"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings"),

  body("tags.*").optional().isString().withMessage("Each tag must be a string"),

  body("colorTheme")
    .optional()
    .isString()
    .withMessage("ColorTheme must be a string"),

  body("rating")
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage("Rating must be between 0 and 5")
    .toFloat(),

  body("isVerified")
    .optional()
    .isBoolean()
    .withMessage("isVerified must be a boolean")
    .toBoolean(),

  body("listingType")
    .notEmpty()
    .withMessage("ListingType is required")
    .isIn(["rent", "sale"])
    .withMessage("ListingType must be either rent or sale"),
];

// CREATE
exports.createProperty = [
  ...exports.propertyValidationRules,
  async (req, res) => {
    const errorResponse = handleValidationErrors(req, res);
    if (errorResponse) return;

    try {
      const property = new Property({ ...req.body, createdBy: req.user.id });
      await property.save();
      
      // Invalidate cache after creating new property
      await invalidateCache(['/properties']);
      
      res.status(201).json(property);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
];

// READ ALL - cached
exports.getAllProperties = [
  cache(60 * 15), // Cache for 15 minutes
  async (req, res) => {
    try {
      const properties = await Property.find();
      res.json(properties);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
];

// READ ONE - cached
exports.getPropertyById = [
  cache(60 * 30), // Cache for 30 minutes
  async (req, res) => {
    try {
      const property = await Property.findById(req.params.id);
      if (!property) return res.status(404).json({ error: "Property not found" });
      res.json(property);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
];

// UPDATE
exports.updateProperty = [
  ...exports.propertyValidationRules,
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // 1. Find property
      const property = await Property.findById(req.params.id);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }

      // 2. Verify ownership
      if (property.createdBy.toString() !== req.user.id) {
        return res.status(403).json({ 
          error: "Unauthorized: You can only update your own properties" 
        });
      }

      // 3. Define allowed updatable fields (adjust based on your schema)
      const allowedUpdates = [
        'title',
        'description',
        'price',
        'bedrooms',
        'bathrooms',
        'areaSqFt',
        'amenities',
        'furnished',
        'availableFrom',
        'tags',
        'isVerified',
        'listingType'
      ];

      // 4. Filter request body to only allowed fields
      const updates = Object.keys(req.body)
        .filter(key => allowedUpdates.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      // 5. Perform update with validation
      const updatedProperty = await Property.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true }
      );

      // 6. Invalidate cache
      await invalidateCache([
        `/properties/${req.params.id}`,
        '/properties'
      ]);

      res.json(updatedProperty);
    } catch (err) {
      // Handle different error types
      if (err.name === 'CastError') {
        return res.status(400).json({ error: "Invalid property ID" });
      }
      if (err.name === 'ValidationError') {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ 
        error: "Server error while updating property" 
      });
    }
  }
];


// DELETE
exports.deleteProperty = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized: user not authenticated" });
    }

    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: "Property not found" });

    if (property.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized: not the property owner" });
    }

    await property.deleteOne();
    
    // Invalidate cache after deleting property
    await invalidateCache([`/properties/${req.params.id}`, '/properties']);

    res.json({ message: "Property deleted" });
  } catch (err) {
    console.error("Delete property error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Advanced filtering with caching
// Helper function to build filter object from query params
const buildFilterObject = (query) => {
  const filterObj = {};
  
  // Process each query parameter
  Object.keys(query).forEach((key) => {
    // Skip pagination parameters
    if (["page", "limit", "sort", "fields"].includes(key)) {
      return;
    }
    
    // Handle special operator parameters like price[gte], price[lte], etc.
    if (key.includes("[")) {
      const fieldName = key.split("[")[0];
      const operator = key.split("[")[1].replace("]", "");
      
      // Initialize nested structure if it doesn't exist
      if (!filterObj[fieldName]) {
        filterObj[fieldName] = {};
      }
      
      // Map operator strings to MongoDB operators
      const mongoOperator = {
        gte: "$gte",
        gt: "$gt",
        lte: "$lte",
        lt: "$lt",
        eq: "$eq",
        ne: "$ne",
      }[operator];
      
      if (mongoOperator) {
        filterObj[fieldName][mongoOperator] = query[key];
      }
    } 
    // Handle comma-separated values (for array fields)
    else if (key === "amenities" && query[key]) {
      filterObj[key] = { $all: query[key].split(",") };
    } 
    // Handle text search
    else if (key === "search" && query[key]) {
      filterObj["$or"] = [
        { title: { $regex: query[key], $options: "i" } },
        { city: { $regex: query[key], $options: "i" } },
        { description: { $regex: query[key], $options: "i" } },
      ];
    } 
    // Handle boolean values
    else if (["isVerified", "isFeatured"].includes(key)) {
      filterObj[key] = query[key] === "true";
    } 
    // Handle regular equality checks
    else {
      filterObj[key] = query[key];
    }
  });
  
  return filterObj;
};

exports.advancedFilter = async (req, res) => {
  try {
    // Build filter object from query parameters
    const filterObj = buildFilterObject(req.query);
    
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query
    let query = Property.find(filterObj);
    
    // Handle sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }
    
    // Handle field selection
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    }
    
    // Execute query with pagination
    const properties = await query.skip(skip).limit(limit);
    
    // Get total count for pagination info
    const total = await Property.countDocuments(filterObj);
    
    // Calculate total pages
    const pages = Math.ceil(total / limit);
    
    res.status(200).json({
      status: "success",
      results: properties.length,
      total,
      page,
      pages,
      data: properties,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
