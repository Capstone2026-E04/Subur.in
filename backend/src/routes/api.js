const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const sensorRoutes = require('./sensor.routes');
const deviceRoutes = require('./device.routes');
const plantRoutes = require('./plant.routes');
const polybagRoutes = require('./polybag.routes');
const recommendationRoutes = require('./recommendation.routes');
const notificationRoutes = require('./notification.routes');

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Subur.in API Router v1 aktif!',
    endpoints: {
      auth: '/api/auth/google',
      users: {
        getProfile: 'GET /api/users/me',
        updateProfile: 'PATCH /api/users/me',
        deleteAccount: 'DELETE /api/users/me',
      },
      devices: {
        register: 'POST /api/devices',
        list: 'GET /api/devices',
        update: 'PATCH /api/devices/:id',
        delete: 'DELETE /api/devices/:id',
        recommendation: 'GET /api/devices/:id/recommendation',
        sendConfig: 'POST /api/devices/:id/config',
      },
      plants: {
        list: 'GET /api/plants',
      },
      polybags: {
        list: 'GET /api/polybags',
      },
      recommendations: {
        history: 'GET /api/recommendations',
        simulate: 'POST /api/recommendations/simulate',
      },
      sensors: {
        stream: 'GET /api/sensors/:deviceId/stream',
        latest: 'GET /api/sensors/:deviceId/latest',
      },
    }
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/devices', deviceRoutes);
router.use('/sensors', sensorRoutes);
router.use('/plants', plantRoutes);
router.use('/polybags', polybagRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;

