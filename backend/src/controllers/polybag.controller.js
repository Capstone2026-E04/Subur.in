const prisma = require('../database/connections/prisma_client');


exports.getAllPolybags = async (req, res, next) => {
  try {
    const polybags = await prisma.polybag.findMany({
      include: {
        polybagType: true
      }
    });

    
    const mappedPolybags = polybags.map(pb => ({
      id: pb.id,
      name: pb.polybagType.name,
      diameter: pb.polybagType.diameter,
      height: pb.polybagType.height,
      soilVolumeLiter: pb.soilVolumeLiter
    }));

    return res.status(200).json({
      success: true,
      message: 'Daftar polybag berhasil diambil.',
      data: mappedPolybags
    });
  } catch (error) {
    console.error('[PolybagController] Gagal mengambil daftar polybag:', {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
