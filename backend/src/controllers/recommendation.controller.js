const prisma = require('../database/connections/prisma_client');
const { generateRecommendation } = require('../ai/services/recommendation.service');
const { sendSuccess, sendError } = require('../utils/response');


exports.simulateRecommendation = async (req, res, next) => {
  try {
    const { phValue, moistureValue, polybagPreset, plantIdOrName } = req.body;

    if (phValue === undefined || moistureValue === undefined) {
      return sendError(res, 400, 'Parameter phValue dan moistureValue wajib dikirimkan!');
    }

    if (!polybagPreset) {
      return sendError(res, 400, 'Parameter polybagPreset wajib diisi (misal: "STANDAR", "BESAR", atau UUID).');
    }

    if (!plantIdOrName) {
      return sendError(res, 400, 'Parameter plantIdOrName wajib diisi (misal: "Pakcoy", "Selada", "Bayam", atau UUID).');
    }

    const ph = parseFloat(phValue);
    const moisture = parseFloat(moistureValue);

    if (isNaN(ph) || isNaN(moisture)) {
      return sendError(res, 400, 'phValue dan moistureValue harus berupa angka valid.');
    }

    if (ph < 0 || ph > 14) {
      return sendError(res, 400, 'Nilai pH harus berada dalam rentang 0 sampai 14.');
    }

    if (moisture < 0 || moisture > 100) {
      return sendError(res, 400, 'Nilai kelembapan harus berada dalam rentang 0 sampai 100.');
    }

    const result = await generateRecommendation({
      phValue: ph,
      moistureValue: moisture,
      polybagPreset,
      plantIdOrName
    });

    return sendSuccess(res, 200, 'Simulasi Fuzzy Logic berhasil dijalankan!', result);

  } catch (error) {
    console.error('[RecommendationController] Gagal menjalankan simulasi fuzzy logic:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    return next(error);
  }
};

exports.getRecommendationHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.query;

    if (deviceId) {
      const device = await prisma.device.findFirst({
        where: { id: deviceId, userId }
      });
      if (!device) {
        return sendError(res, 404, 'Device tidak ditemukan atau Anda tidak memiliki akses.');
      }
    }

    const logs = await prisma.recommendationLog.findMany({
      where: {
        device: {
          userId,
          ...(deviceId ? { id: deviceId } : {})
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        device: {
          select: {
            id: true,
            label: true,
            plant: {
              select: {
                name: true,
                scientificName: true
              }
            }
          }
        }
      }
    });

    return sendSuccess(res, 200, 'Riwayat rekomendasi berhasil diambil.', { logs });

  } catch (error) {
    console.error('[RecommendationController] Gagal mengambil riwayat rekomendasi:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return next(error);
  }
};
