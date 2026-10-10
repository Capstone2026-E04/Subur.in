const prisma = require("../../database/connections/prisma_client");
const { AppError } = require("../../errors/AppError");
const { runInference } = require("../core/engine");
const { interpretCategory } = require("../utils/interpreter");
const { calculateWaterVolume } = require("../dosage/water_calculator");
const { calculateLimeDosage } = require("../dosage/lime_calculator");
const { calculateSulfurDosage } = require("../dosage/sulfur_calculator");
const POLYBAG = require("../config/polybag");
const PLANT_MOISTURE = require("../config/plant_moisture");
const { checkPhCorrection } = require("../core/safety_gate");

async function generateRecommendation({
  phValue,
  moistureValue,
  plantIdOrName,
  consistentReadings = Infinity,
  lastCorrectionAt = null,
  deviceId = null,
}) {
  if (typeof phValue !== "number" || typeof moistureValue !== "number") {
    throw new AppError("phValue dan moistureValue harus berupa angka.", 400);
  }
  if (phValue < 0 || phValue > 14) {
    throw new AppError("phValue harus berada dalam rentang 0 sampai 14.", 400);
  }
  if (moistureValue < 0 || moistureValue > 100) {
    throw new AppError(
      "moistureValue harus berada dalam rentang 0 sampai 100.",
      400,
    );
  }
  if (!plantIdOrName) {
    throw new AppError("plantIdOrName wajib diisi.", 400);
  }

  let plant = null;

  try {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        plantIdOrName,
      );
    if (isUuid) {
      plant = await prisma.plant.findUnique({
        where: { id: plantIdOrName },
      });
    } else {
      plant = await prisma.plant.findFirst({
        where: {
          name: {
            equals: plantIdOrName,
            mode: "insensitive",
          },
        },
      });
    }
  } catch (dbError) {
    console.error("[RecommendationService] Gagal query data tanaman:", {
      message: dbError.message,
      stack: dbError.stack,
      plantIdOrName,
    });
    throw dbError;
  }

  if (!plant) {
    throw new AppError(
      `Data tanaman dengan identitas "${plantIdOrName}" tidak ditemukan di database.`,
      404,
    );
  }

  const moistureParams = PLANT_MOISTURE[plant.name.trim().toLowerCase()];
  if (!moistureParams) {
    throw new AppError(
      `Tanaman "${plant.name}" belum memiliki parameter NMI (didukung: ${Object.keys(PLANT_MOISTURE).join(", ")}).`,
      422,
    );
  }

  if (deviceId && !lastCorrectionAt) {
    const last = await prisma.correctionLog.findFirst({
      where: { deviceId },
      orderBy: { appliedAt: "desc" },
      select: { appliedAt: true },
    });
    lastCorrectionAt = last?.appliedAt ?? null;
  }

  const { minPh, maxPh, phTarget } = plant;
  const inference = runInference(phValue, moistureValue, {
    minPh,
    maxPh,
    trigger: moistureParams.trigger,
  });
  const interpretation = interpretCategory(inference.categoryCode);
  const { waterAction, phAction } = inference;

  const phCorrection = checkPhCorrection({
    phAction,
    waterAction,
    ph: phValue,
    minPh,
    maxPh,
    consistentReadings,
    lastCorrectionAt,
  });
  const correctionReady = phCorrection.status === "READY";

  const waterDetail =
    waterAction === "IRRIGATE"
      ? calculateWaterVolume(
          moistureValue,
          moistureParams.target,
          POLYBAG.volumeLiter,
        )
      : null;
  const limeDetail =
    phAction === "LIME"
      ? calculateLimeDosage(phValue, POLYBAG.volumeLiter, phTarget)
      : null;
  const sulfurDetail =
    phAction === "SULFUR"
      ? calculateSulfurDosage(phValue, POLYBAG.volumeLiter, phTarget)
      : null;

  return {
    phValue,
    moistureValue,
    fuzzyIndex: parseFloat(inference.strength.toFixed(4)),
    categoryCode: inference.categoryCode,
    actionText: interpretation.actionText,
    waterAction,
    phAction,
    phCorrection,
    waterVolumeLiter: waterDetail?.waterVolumeLiter ?? 0,
    limeDosageGram: correctionReady ? (limeDetail?.limeDosageGram ?? 0) : 0,
    sulfurDosageGram: correctionReady
      ? (sulfurDetail?.sulfurDosageGram ?? 0)
      : 0,
    reduceWatering: waterAction === "STOP",

    _debug: {
      membership: inference.membership,
      activeRules: inference.activeRules,
      aggregation: inference.aggregation,
      polybagPresetUsed: POLYBAG.name,
      areaM2: POLYBAG.areaM2,
      volumeLiterUsed: POLYBAG.volumeLiter,
      plantUsed: `${plant.name} (${plant.scientificName || "n/a"})`,
      phTarget: parseFloat(phTarget.toFixed(3)),
      nmiTrigger: moistureParams.trigger,
      nmiTarget: moistureParams.target,
      waterDetail,
      limeDetail,
      sulfurDetail,
    },
  };
}

module.exports = { generateRecommendation };
