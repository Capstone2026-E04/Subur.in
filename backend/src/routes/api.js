const express = require('express');
const router = express.Router();
const prisma = require('../database/connections/prisma_client');
const { getRedisClient } = require('../database/connections/redis');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const sensorRoutes = require('./sensor.routes');
const deviceRoutes = require('./device.routes');
const plantRoutes = require('./plant.routes');
const polybagRoutes = require('./polybag.routes');
const recommendationRoutes = require('./recommendation.routes');
const notificationRoutes = require('./notification.routes');
const telegramRoutes = require('./telegram.routes');
const { sendSuccess, sendError } = require('../utils/response');

router.get('/version', (req, res) => {
  return sendSuccess(res, 200, 'Informasi versi build.', {
    commit: process.env.GIT_COMMIT_SHA || 'unknown',
    deployedAt: req.app.locals.startedAt,
  });
});

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

    const message =
      redisStatus === "CONNECTED"
        ? "Server Subur.in-Backend berjalan normal dan terkoneksi ke Supabase & Redis!"
        : "Server berjalan normal, terkoneksi ke Supabase, namun bermasalah dengan Redis.";

    return sendSuccess(res, 200, message, {
      status: "UP",
      database: "CONNECTED",
      redis: redisStatus,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("[API] Health check gagal, koneksi database bermasalah:", {
      message: error.message,
      stack: error.stack,
    });
    return sendError(res, 503, "Server berjalan, namun GAGAL terkoneksi ke database Supabase.");
  }
});

router.get('/', (req, res) => {
  return sendSuccess(res, 200, 'Subur.in API Router v1 aktif!', {
    endpoints: {
      health: 'GET /api/health',
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
      telegram: {
        webhook: 'POST /api/telegram/webhook',
        linkCode: 'POST /api/users/me/telegram/link-code',
        unlink: 'DELETE /api/users/me/telegram',
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
router.use('/telegram', telegramRoutes);

module.exports = router;

