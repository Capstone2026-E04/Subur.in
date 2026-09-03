const prisma = require('../database/connections/prisma_client');
const { generateRecommendation } = require('../ai/services/recommendation.service');


exports.simulateRecommendation = async (req, res) => {
  try {
    const { phValue, moistureValue, polybagPreset, plantIdOrName } = req.body;

    if (phValue === undefined || moistureValue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Parameter phValue dan moistureValue wajib dikirimkan!'
      });
    }

    if (!polybagPreset) {
      return res.status(400).json({
        success: false,
        message: 'Parameter polybagPreset wajib diisi (misal: "STANDAR", "BESAR", atau UUID).'
      });
    }

    if (!plantIdOrName) {
      return res.status(400).json({
        success: false,
        message: 'Parameter plantIdOrName wajib diisi (misal: "Pakcoy", "Selada", "Bayam", atau UUID).'
      });
    }

    const ph = parseFloat(phValue);
    const moisture = parseFloat(moistureValue);

    if (isNaN(ph) || isNaN(moisture)) {
      return res.status(400).json({
        success: false,
        message: 'phValue dan moistureValue harus berupa angka valid.'
      });
    }

    if (ph < 0 || ph > 14) {
      return res.status(400).json({
        success: false,
        message: 'Nilai pH harus berada dalam rentang 0 sampai 14.'
      });
    }

    if (moisture < 0 || moisture > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nilai kelembapan harus berada dalam rentang 0 sampai 100.'
      });
    }

    const result = await generateRecommendation({
      phValue: ph,
      moistureValue: moisture,
      polybagPreset,
      plantIdOrName
    });

    return res.status(200).json({
      success: true,
      message: 'Simulasi Fuzzy Logic berhasil dijalankan!',
      data: result
    });

  } catch (error) {
    console.error('Simulate Recommendation Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menjalankan simulasi fuzzy logic.',
      error: error.message
    });
  }
};

exports.getRecommendationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.query;

    if (deviceId) {
      const device = await prisma.device.findFirst({
        where: { id: deviceId, userId }
      });
      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device tidak ditemukan atau Anda tidak memiliki akses.'
        });
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

    return res.status(200).json({
      success: true,
      message: 'Riwayat rekomendasi berhasil diambil.',
      data: { logs }
    });

  } catch (error) {
    console.error('Get Recommendation History Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat rekomendasi.',
      error: error.message
    });
  }
};
