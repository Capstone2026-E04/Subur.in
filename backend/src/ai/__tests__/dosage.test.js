const assert = require('assert');
const { calculateWaterVolume } = require('../dosage/water_calculator');
const { calculateLimeDosage } = require('../dosage/lime_calculator');
const { calculateSulfurDosage } = require('../dosage/sulfur_calculator');

function runTests() {
  console.log(' Memulai Pengujian Unit Kalkulator Dosis...');

  console.log('\n1. Menguji calculateWaterVolume...');
  assert.strictEqual(calculateWaterVolume(35, 10).waterVolumeLiter, 0);
  assert.ok(calculateWaterVolume(20, 10).waterVolumeLiter > 0);
  const cappedWater = calculateWaterVolume(0, 10);
  assert.strictEqual(cappedWater.cappedByVmax, true);
  assert.ok(cappedWater.waterVolumeLiter <= cappedWater.vMax);
  console.log(' Test 1 Berhasil: Volume air 0 saat sudah target, proporsional saat kurang, dan ter-cap oleh V_MAX_FRACTION.');

  console.log('\n2. Menguji calculateLimeDosage...');
  assert.strictEqual(calculateLimeDosage(6.0, 10, 6.5, 6.0).limeDosageGram, 0);
  const limeDosage = calculateLimeDosage(5.5, 10, 6.5, 6.0);
  assert.strictEqual(limeDosage.limeDosageGram, 13.00);
  const limeDosageLarge = calculateLimeDosage(0, 10, 6.5, 6.0);
  assert.strictEqual(limeDosageLarge.limeDosageGram, 1.3 * 10 * 6.5);
  console.log(' Test 2 Berhasil: Dosis kapur 0 saat dalam toleransi, dan proporsional (tanpa batas atas) sesuai m_L = max(0, K_L V (pH_T - pH)).');

  console.log('\n3. Menguji calculateSulfurDosage...');
  assert.strictEqual(calculateSulfurDosage(7.0, 10, 6.5, 7.0).sulfurDosageGram, 0);
  const sulfurDosage = calculateSulfurDosage(7.5, 10, 6.5, 7.0);
  assert.ok(sulfurDosage.sulfurDosageGram > 0);
  assert.strictEqual(sulfurDosage.cappedByMSMax, false);
  const cappedSulfur = calculateSulfurDosage(14, 10, 6.5, 7.0);
  assert.strictEqual(cappedSulfur.cappedByMSMax, true);
  assert.strictEqual(cappedSulfur.requiresStagedApplication, true);
  assert.ok(cappedSulfur.sulfurDosageGram <= cappedSulfur.mSMax);
  console.log(' Test 3 Berhasil: Dosis sulfur 0 saat dalam toleransi, proporsional, dan ter-cap oleh M_S_MAX_PER_LITER pada pH sangat basa.');

  console.log('\n SEMUA PENGUJIAN UNIT KALKULATOR DOSIS BERHASIL DILAKUKAN! ');
}

runTests();
