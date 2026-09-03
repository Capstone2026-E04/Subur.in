const express = require('express');
const router = express.Router();
const client = require('prom-client');
const prisma = require('../database/connections/prisma_client');
const { getRedisClient } = require('../database/connections/redis');
const authRoutes = require('./auth.routes');

const metricsRegister = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegister });
const userRoutes = require('./user.routes');
const sensorRoutes = require('./sensor.routes');
const deviceRoutes = require('./device.routes');
const plantRoutes = require('./plant.routes');
const polybagRoutes = require('./polybag.routes');
const recommendationRoutes = require('./recommendation.routes');
const notificationRoutes = require('./notification.routes');

router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    let redisStatus = "UNKNOWN";
    try {
      const redis = getRedisClient();
      const pingResult = await redis.ping();
      redisStatus = pingResult === "PONG" ? "CONNECTED" : "UNHEALTHY";
    } catch (redisErr) {
      redisStatus = `ERROR: ${redisErr.message}`;
    }

    return res.status(200).json({
      status: "UP",
      database: "CONNECTED",
      redis: redisStatus,
      message:
        redisStatus === "CONNECTED"
          ? "Server Subur.in-Backend berjalan normal dan terkoneksi ke Supabase & Redis!"
          : "Server berjalan normal, terkoneksi ke Supabase, namun bermasalah dengan Redis.",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return res.status(500).json({
      status: "DOWN",
      message: "Server berjalan, namun GAGAL terkoneksi ke database Supabase.",
      error: error.message,
      timestamp: new Date(),
    });
  }
});

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Subur.in API Router v1 aktif!',
    endpoints: {
      health: 'GET /api/health',
      metrics: 'GET /api/metrics',
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

