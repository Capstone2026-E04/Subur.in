const prisma = require('../database/connections/prisma_client');


exports.getAllPlants = async (req, res, next) => {
  try {
    const plants = await prisma.plant.findMany({
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar tanaman berhasil diambil.',
      data: plants
    });
  } catch (error) {
    console.error('[PlantController] Gagal mengambil daftar tanaman:', {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
