const Recommendation = require('../models/Recommendation');
const User = require('../models/User');

exports.recommendProperty = async (req, res) => {
  try {
    const { propertyId, recipientEmail, message } = req.body;
    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) return res.status(404).json({ error: "User not found" });

    if(!propertyId) {
      return res.status(400).json({ error: "Property ID is required" });
    }

    const recommendation = await Recommendation.create({
      property: propertyId,
      fromUser: req.user.id,
      toUser: recipient._id,
      message,
    });

    res.json({ status: "success", recommendation });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getReceivedRecommendations = async (req, res) => {
  try {
    const recs = await Recommendation.find({ toUser: req.user.id })
      .populate('property')
      .populate('fromUser', 'email');
    
    // Filter out recommendations with deleted properties and add a note about deleted ones
    const validRecs = recs.filter(rec => rec.property !== null);
    const deletedCount = recs.length - validRecs.length;
    
    res.json({ 
      status: "success", 
      recommendations: validRecs,
      deletedPropertiesCount: deletedCount
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
