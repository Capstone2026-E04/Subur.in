const prisma = require("../database/connections/prisma_client");
const { sendSuccess } = require("../utils/response");
const PLANT_MOISTURE = require("../ai/config/plant_moisture");

exports.getAllPlants = async (req, res, next) => {
  try {
    const plants = await prisma.plant.findMany({
      orderBy: { name: "asc" },
    });

    const data = plants.map((plant) => {
      const moisture = PLANT_MOISTURE[plant.name.trim().toLowerCase()];
      return {
        ...plant,
        vwcTrigger: moisture?.trigger ?? null,
        vwcTarget: moisture?.target ?? null,
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
