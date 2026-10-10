const { generateRecommendation } = require("./services/recommendation.service");
const prisma = require("../database/connections/prisma_client");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("====================================================");
console.log("       SIMULATOR FUZZY LOGIC - SUBUR.IN             ");
console.log("====================================================");
console.log("Simulator ini mensimulasikan perhitungan Fuzzy Logic");
console.log("Mamdani untuk menentukan dosis penyiraman air, kapur,");
console.log("atau sulfur secara dinamis berdasarkan jenis tanaman");
console.log("dan preset polybag prototipe (20x20 cm, media 2 L).\n");

function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function startSimulation() {
  try {
    const plants = await prisma.plant.findMany();
    if (plants.length === 0) {
      console.log(
        " Tidak ada data tanaman di database. Harap jalankan seeder terlebih dahulu.",
      );
      rl.close();
      return;
    }

    const phInput = await askQuestion("Masukkan nilai pH tanah (0.0 - 14.0): ");
    const ph = parseFloat(phInput);
    if (isNaN(ph) || ph < 0 || ph > 14) {
      console.log(
        " Nilai pH tidak valid. Harap masukkan angka antara 0.0 - 14.0.",
      );
      rl.close();
      return;
    }

    const moistureInput = await askQuestion(
      "Masukkan nilai NMI kelembapan (0 - 100): ",
    );
    const moisture = parseFloat(moistureInput);
    if (isNaN(moisture) || moisture < 0 || moisture > 100) {
      console.log(
        " Nilai kelembaban tidak valid. Harap masukkan angka antara 0 - 100.",
      );
      rl.close();
      return;
    }

    console.log("\nPilih Jenis Tanaman (Wajib):");
    plants.forEach((plant, index) => {
      console.log(
        `${index + 1}. ${plant.name} (${plant.scientificName || "n/a"}) [Ideal: pH ${plant.minPh}-${plant.maxPh}, pH-Target sesuai C501]`,
      );
    });
    const plantChoiceInput = await askQuestion("Pilihan Anda (1/2/3...): ");
    const plantIndex = parseInt(plantChoiceInput) - 1;

    if (isNaN(plantIndex) || plantIndex < 0 || plantIndex >= plants.length) {
      console.log(" Pilihan tanaman tidak valid.");
      rl.close();
      return;
    }

    const selectedPlant = plants[plantIndex];
    console.log(` Tanaman terpilih: ${selectedPlant.name}`);

    console.log(
      "\nMenghitung rekomendasi menggunakan Fuzzy Inference System...",
    );
    const result = await generateRecommendation({
      phValue: ph,
      moistureValue: moisture,
      plantIdOrName: selectedPlant.id,
    });

    console.log("\n====================================================");
    console.log("                HASIL REKOMENDASI                   ");
    console.log("====================================================");
    console.log(
      `Input Sensor      : pH = ${result.phValue}, NMI = ${result.moistureValue}`,
    );
    console.log(`Tanaman Terpilih  : ${result._debug.plantUsed}`);
    console.log(
      `Target Parameter  : pH ideal = ${result._debug.phTarget.toFixed(2)}, NMI trigger = ${result._debug.nmiTrigger}, NMI target = ${result._debug.nmiTarget}`,
    );
    console.log(`Preset Polybag    : ${result._debug.polybagPresetUsed}`);
    console.log(`Luas Permukaan    : ${result._debug.areaM2} m²`);
    console.log(`Volume Tanah      : ${result._debug.volumeLiterUsed} Liter`);
    console.log("----------------------------------------------------");
    console.log(`Kekuatan Aturan   : ${result.fuzzyIndex.toFixed(4)}`);
    console.log(`Kode Kategori     : ${result.categoryCode}`);
    console.log(`Tindakan          : ${result.actionText}`);
    console.log(
      `Aksi Air / pH     : ${result.waterAction} / ${result.phAction} (${result.phCorrection.status})`,
    );
    result.phCorrection.reasons.forEach((r) => console.log(`  - ${r}`));
    console.log("----------------------------------------------------");
    console.log("DOSIS REKOMENDASI:");
    console.log(` Volume Air     : ${result.waterVolumeLiter} Liter`);
    console.log(` Dosis Kapur    : ${result.limeDosageGram} Gram`);
    console.log(` Dosis Sulfur   : ${result.sulfurDosageGram} Gram`);
    console.log(` Kurangi Air?   : ${result.reduceWatering ? "YA" : "TIDAK"}`);
    console.log("====================================================");
  } catch (error) {
    console.error("[Simulate] Terjadi kesalahan selama simulasi:", {
      message: error.message,
      stack: error.stack,
    });
    if (
      error.message.includes("Can't reach database server") ||
      error.code === "P1001"
    ) {
      console.error("\n Hubungan ke database gagal.");
      console.error(
        " Pastikan database Supabase Anda sedang aktif (tidak dalam status paused/ditangguhkan).",
      );
      console.error(
        " Buka dashboard Supabase Anda dan aktifkan kembali jika diperlukan.",
      );
    }
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

startSimulation();
