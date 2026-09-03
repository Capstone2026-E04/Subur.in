const assert = require('assert');
const { generateRecommendation } = require('../services/recommendation.service');
const prisma = require('../../database/connections/prisma_client');

async function runTests() {
  console.log(' Memulai Pengujian Unit Modul Rekomendasi (Database-Only)...');

  try {
    const dbPolybags = await prisma.polybag.findMany({
      include: { polybagType: true }
    });
    const targetPlant = await prisma.plant.findFirst({
      where: {
        name: {
          equals: 'Selada',
          mode: 'insensitive'
        }
      }
    });

    if (dbPolybags.length === 0 || !targetPlant) {
      console.log('️ Skip Pengujian: Pastikan database telah di-seed dengan benar ("node prisma/seed.js").');
      await prisma.$disconnect();
      return;
    }

    const targetPolybag = dbPolybags[0];

    console.log('\n1. Menguji Integrasi Polybag Database...');
    const resultPolybag = await generateRecommendation({
      phValue: 6.5,
      moistureValue: 60.0,
      polybagPreset: targetPolybag.id,
      plantIdOrName: targetPlant.id
    });

    assert.strictEqual(resultPolybag.phValue, 6.5);
    assert.strictEqual(resultPolybag.moistureValue, 60.0);
    assert.strictEqual(resultPolybag._debug.polybagPresetUsed, targetPolybag.polybagType.name.toUpperCase());
    assert.strictEqual(resultPolybag._debug.volumeLiterUsed, targetPolybag.soilVolumeLiter);

    const expectedArea = Math.PI * Math.pow((targetPolybag.polybagType.diameter / 2) / 100, 2);
    assert.strictEqual(resultPolybag._debug.areaM2, parseFloat(expectedArea.toFixed(5)));
    console.log(' Test 1 Berhasil: Sukses memuat spesifikasi polybag secara dinamis menggunakan UUID.');

    console.log('\n2. Menguji Integrasi Parameter Dinamis Tanaman (Selada)...');
    const resultPlant = await generateRecommendation({
      phValue: 5.5,
      moistureValue: 40.0,
      polybagPreset: targetPolybag.id,
      plantIdOrName: targetPlant.id
    });

    const expectedPhTarget = 6.5;
    const expectedThetaTarget = 0.30;

    assert.strictEqual(resultPlant._debug.phTarget, expectedPhTarget);
    assert.strictEqual(resultPlant._debug.thetaTarget, expectedThetaTarget);

    const expectedLimeDosage = parseFloat((1.3 * targetPolybag.soilVolumeLiter * 1.0).toFixed(2));
    assert.strictEqual(resultPlant.limeDosageGram, expectedLimeDosage);
    console.log(` Test 2 Berhasil: Target pH dinamis Selada (${expectedPhTarget}) & target kelembaban (${expectedThetaTarget}) terhitung serta diaplikasikan dalam rumus dosis kapur (${expectedLimeDosage}g) secara tepat.`);

    console.log('\n3. Menguji Validasi Range pH dan Kelembaban...');
    await assert.rejects(
      generateRecommendation({
        phValue: 15.0,
        moistureValue: 40.0,
        polybagPreset: targetPolybag.id,
        plantIdOrName: targetPlant.id
      }),
      {
        name: 'RangeError',
        message: 'phValue harus berada dalam rentang 0 sampai 14.'
      }
    );

    await assert.rejects(
      generateRecommendation({
        phValue: 6.0,
        moistureValue: -10.0,
        polybagPreset: targetPolybag.id,
        plantIdOrName: targetPlant.id
      }),
      {
        name: 'RangeError',
        message: 'moistureValue harus berada dalam rentang 0 sampai 100.'
      }
    );
    console.log(' Test 3 Berhasil: Validasi rentang pH (0-14) dan Kelembaban (0-100) bekerja dengan baik.');

    console.log('\n SEMUA PENGUJIAN UNIT DATABASE-ONLY BERHASIL DILAKUKAN! ');
  } catch (error) {
    console.error('\n Terjadi kesalahan saat pengujian:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
