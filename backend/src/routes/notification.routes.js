"use strict";

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/', notificationController.getUserNotifications);
router.patch('/read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);
router.post('/test', notificationController.createTestNotification);

module.exports = router;
