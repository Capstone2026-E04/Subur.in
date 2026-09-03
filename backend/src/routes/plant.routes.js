const express = require('express');
const router = express.Router();
const plantController = require('../controllers/plant.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, plantController.getAllPlants);

module.exports = router;
