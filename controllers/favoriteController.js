const Favorite = require('../models/Favorite');
const Property = require('../models/Property');

// Create favorite
exports.createFavorite = async (req, res) => {
  try {
    const { propertyId } = req.body;
    
    // Check if property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Create favorite
    const favorite = await Favorite.create({
      user: req.user.id,
      property: propertyId
    });

    res.status(201).json(favorite);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Property already favorited' });
    }
    res.status(500).json({ error: err.message });
  }
};

// Get user favorites
exports.getUserFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate('property', 'title price city state')
      .sort('-createdAt');

    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete favorite
exports.deleteFavorite = async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    res.json({ message: 'Favorite removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
