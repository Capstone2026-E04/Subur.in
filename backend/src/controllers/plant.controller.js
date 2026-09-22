const prisma = require('../database/connections/prisma_client');
const { sendSuccess } = require('../utils/response');


exports.getAllPlants = async (req, res, next) => {
  try {
    const plants = await prisma.plant.findMany({
      orderBy: { name: 'asc' }
    });

    return sendSuccess(res, 200, 'Daftar tanaman berhasil diambil.', plants);
  } catch (error) {
    console.error('[PlantController] Gagal mengambil daftar tanaman:', {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
