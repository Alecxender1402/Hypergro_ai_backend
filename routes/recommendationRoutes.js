const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const recommendationController = require('../controllers/recommendationController');

router.post('/', auth, recommendationController.recommendProperty);
router.get('/received', auth, recommendationController.getReceivedRecommendations);

module.exports = router;
