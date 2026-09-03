const express = require('express');
const router = express.Router();
const polybagController = require('../controllers/polybag.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, polybagController.getAllPolybags);

module.exports = router;
