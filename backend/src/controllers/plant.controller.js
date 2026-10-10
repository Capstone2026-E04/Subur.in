const prisma = require("../database/connections/prisma_client");
const { sendSuccess } = require("../utils/response");
const PLANT_MOISTURE = require("../ai/config/plant_moisture");

exports.getAllPlants = async (req, res, next) => {
  try {
    const plants = await prisma.plant.findMany({
      orderBy: { name: "asc" },
    });

    const data = plants.map((plant) => {
      const nmi = PLANT_MOISTURE[plant.name.trim().toLowerCase()];
      return {
        ...plant,
        nmiTrigger: nmi?.trigger ?? null,
        nmiTarget: nmi?.target ?? null,
      };
    });

    return sendSuccess(res, 200, "Daftar tanaman berhasil diambil.", data);
  } catch (error) {
    console.error("[PlantController] Gagal mengambil daftar tanaman:", {
      message: error.message,
      stack: error.stack,
    });
    return next(error);
  }
};
