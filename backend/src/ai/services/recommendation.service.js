const prisma = require('../../database/connections/prisma_client');
const { AppError }               = require('../../errors/AppError');
const { runInference }           = require('../core/engine');
const { interpretCategory }      = require('../utils/interpreter');
const { calculateWaterVolume }   = require('../dosage/water_calculator');
const { calculateLimeDosage }    = require('../dosage/lime_calculator');
const { calculateSulfurDosage }  = require('../dosage/sulfur_calculator');
const { getPhysicalPreset }      = require('../config/physical_presets');
const { THETA_TARGET }           = require('../config/treatment_constants');

async function generateRecommendation({ phValue, moistureValue, polybagPreset, plantIdOrName }) {
  if (typeof phValue !== 'number' || typeof moistureValue !== 'number') {
    throw new AppError('phValue dan moistureValue harus berupa angka.', 400);
  }
  if (phValue < 0 || phValue > 14) {
    throw new AppError('phValue harus berada dalam rentang 0 sampai 14.', 400);
  }
  if (moistureValue < 0 || moistureValue > 100) {
    throw new AppError('moistureValue harus berada dalam rentang 0 sampai 100.', 400);
  }
  if (!polybagPreset) {
    throw new AppError('polybagPreset wajib diisi.', 400);
  }
  if (!plantIdOrName) {
    throw new AppError('plantIdOrName wajib diisi.', 400);
  }

  const preset = await getPhysicalPreset(polybagPreset);

  let plant = null;

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(plantIdOrName);
    if (isUuid) {
      plant = await prisma.plant.findUnique({
        where: { id: plantIdOrName }
      });
    } else {
      plant = await prisma.plant.findFirst({
        where: {
          name: {
            equals: plantIdOrName,
            mode: 'insensitive'
          }
        }
      });
    }
  } catch (dbError) {
    console.error('[RecommendationService] Gagal query data tanaman:', {
      message: dbError.message,
      stack: dbError.stack,
      plantIdOrName,
    });
    throw dbError;
  }

  if (!plant) {
    throw new AppError(`Data tanaman dengan identitas "${plantIdOrName}" tidak ditemukan di database.`, 404);
  }

  const phTarget = plant.phTarget;

  const plantParams = {
    minPh: plant.minPh,
    maxPh: plant.maxPh,
    phTarget: plant.phTarget,
  };

  const inference = runInference(phValue, moistureValue, plantParams);

  const interpretation = interpretCategory(inference.categoryCode);

  let waterVolumeLiter = 0;
  let limeDosageGram   = 0;
  let sulfurDosageGram = 0;
  let waterDetail      = null;
  let limeDetail       = null;
  let sulfurDetail     = null;

  if (interpretation.needsWater) {
    waterDetail       = calculateWaterVolume(moistureValue, preset.volumeLiter);
    waterVolumeLiter  = waterDetail.waterVolumeLiter;
  }

  if (interpretation.needsLime) {
    limeDetail       = calculateLimeDosage(phValue, preset.volumeLiter, phTarget, plant.minPh);
    limeDosageGram   = limeDetail.limeDosageGram;
  }

  if (interpretation.needsSulfur) {
    sulfurDetail      = calculateSulfurDosage(phValue, preset.volumeLiter, phTarget, plant.maxPh);
    sulfurDosageGram  = sulfurDetail.sulfurDosageGram;
  }


  return {
    phValue,
    moistureValue,
    fuzzyIndex:       inference.yStar,
    categoryCode:     inference.categoryCode,
    actionText:       interpretation.actionText,
    waterVolumeLiter,
    limeDosageGram,
    sulfurDosageGram,
    reduceWatering:   interpretation.reduceWatering,

    _debug: {
      inputClamped:       inference.inputClamped,
      membership:         inference.membership,
      activeRules:        inference.activeRules,
      yStar:              inference.yStar,
      categoryStar:       inference.categoryStar,
      polybagPresetUsed:  preset.name,
      areaM2:             parseFloat(preset.areaM2.toFixed(5)),
      volumeLiterUsed:    parseFloat(preset.volumeLiter.toFixed(3)),
      plantUsed:          `${plant.name} (${plant.scientificName || 'n/a'})`,
      phTarget:           parseFloat(phTarget.toFixed(3)),
      thetaTarget:        THETA_TARGET,
      waterDetail,
      limeDetail,
      sulfurDetail,
    },
  };
}

module.exports = { generateRecommendation };
