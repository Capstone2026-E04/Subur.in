const prisma = require('../../database/connections/prisma_client');
const { runInference }           = require('../core/engine');
const { interpretCategory }      = require('../utils/interpreter');
const { calculateWaterVolume }   = require('../dosage/water_calculator');
const { calculateLimeDosage }    = require('../dosage/lime_calculator');
const { calculateSulfurDosage }  = require('../dosage/sulfur_calculator');
const { getPhysicalPreset }      = require('../config/physical_presets');

async function generateRecommendation({ phValue, moistureValue, polybagPreset, plantIdOrName }) {
  if (typeof phValue !== 'number' || typeof moistureValue !== 'number') {
    throw new TypeError('phValue dan moistureValue harus berupa angka.');
  }
  if (phValue < 0 || phValue > 14) {
    throw new RangeError('phValue harus berada dalam rentang 0 sampai 14.');
  }
  if (moistureValue < 0 || moistureValue > 100) {
    throw new RangeError('moistureValue harus berada dalam rentang 0 sampai 100.');
  }
  if (!polybagPreset) {
    throw new Error('polybagPreset wajib diisi.');
  }
  if (!plantIdOrName) {
    throw new Error('plantIdOrName wajib diisi.');
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
    throw new Error(`Database error saat memuat data tanaman: "${dbError.message}".`);
  }

  if (!plant) {
    throw new Error(`Data tanaman dengan identitas "${plantIdOrName}" tidak ditemukan di database.`);
  }

  const phTarget = plant.phTarget;
  const targetMoisture = 30.0;
  const thetaTarget = targetMoisture / 100;

  const plantParams = {
    minPh: plant.minPh,
    maxPh: plant.maxPh,
    phTarget: plant.phTarget,
    minMoisture: 20.0,
    maxMoisture: 40.0,
    targetMoisture: targetMoisture
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
    waterDetail       = calculateWaterVolume(moistureValue, preset.volumeLiter, targetMoisture);
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
      thetaTarget:        parseFloat(thetaTarget.toFixed(4)),
      waterDetail,
      limeDetail,
      sulfurDetail,
    },
  };
}

module.exports = { generateRecommendation };
