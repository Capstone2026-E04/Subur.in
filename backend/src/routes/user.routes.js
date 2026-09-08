const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);

router.get('/me', userController.getProfile);
router.patch('/me', userController.updateProfile);
router.delete('/me', userController.deleteAccount);
router.post('/me/telegram/link-code', userController.getTelegramLinkCode);
router.delete('/me/telegram', userController.unlinkTelegram);

module.exports = router;
