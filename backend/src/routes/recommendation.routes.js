const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/simulate', recommendationController.simulateRecommendation);
router.get('/', authMiddleware, recommendationController.getRecommendationHistory);

module.exports = router;
