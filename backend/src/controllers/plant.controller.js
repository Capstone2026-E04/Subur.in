const prisma = require('../database/connections/prisma_client');


exports.getAllPlants = async (req, res) => {
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
    console.error('Get All Plants Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil daftar tanaman.',
      error: error.message
    });
  }
};
