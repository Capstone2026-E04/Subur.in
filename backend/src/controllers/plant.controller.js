const prisma = require("../database/connections/prisma_client");
const { sendSuccess } = require("../utils/response");
const {
  THETA_FILL,
  THETA_TRIGGER,
} = require("../ai/config/treatment_constants");

exports.getAllPlants = async (req, res, next) => {
  try {
    const plants = await prisma.plant.findMany({
      orderBy: { name: "asc" },
    });

    const data = plants.map((plant) => ({
      ...plant,
      vwcTrigger: THETA_TRIGGER * 100,
      vwcTarget: parseFloat((THETA_FILL * 100).toFixed(2)),
    }));

    return sendSuccess(res, 200, "Daftar tanaman berhasil diambil.", data);
  } catch (error) {
    console.error("[PlantController] Gagal mengambil daftar tanaman:", {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
