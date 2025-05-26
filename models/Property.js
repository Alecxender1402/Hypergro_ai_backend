const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  id: String,
  title: String,
  type: String,
  price: Number,
  state: String,
  city: String,
  areaSqFt: Number,
  bedrooms: Number,
  bathrooms: Number,
  amenities: [String],
  furnished: String,
  availableFrom: Date,
  listedBy: String,
  tags: [String],
  rating: Number,
  isVerified: Boolean,
  listingType: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

propertySchema.index({ price: 1 });
propertySchema.index({ city: 1, bedrooms: 1 });
propertySchema.index({ amenities: 1 });
propertySchema.index({ availableFrom: 1 });


module.exports = mongoose.model('Property', propertySchema);
