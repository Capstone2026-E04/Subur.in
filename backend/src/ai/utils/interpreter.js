const CATEGORY_LOOKUP = {
  C1: {
    code: 'C1',
    actionText: 'Kondisi tanah optimal. Tidak ada intervensi yang diperlukan. Pertahankan rutinitas perawatan saat ini.',
    needsWater:     false,
    needsLime:      false,
    needsSulfur:    false,
    reduceWatering: false,
  },
  C2: {
    code: 'C2',
    actionText: 'pH tanah optimal, namun tanah terlalu kering. Segera lakukan penyiraman sesuai dosis yang direkomendasikan.',
    needsWater:     true,
    needsLime:      false,
    needsSulfur:    false,
    reduceWatering: false,
  },
  C3: {
    code: 'C3',
    actionText: 'pH tanah optimal, namun tanah terlalu jenuh air. Hentikan penyiraman sementara. Sistem akan memantau kelembaban setiap 6 jam dan memberi notifikasi saat kondisi membaik.',
    needsWater:     false,
    needsLime:      false,
    needsSulfur:    false,
    reduceWatering: true,
  },
  C4: {
    code: 'C4',
    actionText: 'pH tanah terlalu asam. Tambahkan kapur pertanian (dolomit) sesuai dosis yang direkomendasikan untuk menetralkan keasaman tanah.',
    needsWater:     false,
    needsLime:      true,
    needsSulfur:    false,
    reduceWatering: false,
  },
  C5: {
    code: 'C5',
    actionText: 'pH tanah terlalu asam DAN tanah kering. Tambahkan kapur pertanian (dolomit) sesuai dosis, kemudian lakukan penyiraman sesuai volume yang direkomendasikan.',
    needsWater:     true,
    needsLime:      true,
    needsSulfur:    false,
    reduceWatering: false,
  },
  C6: {
    code: 'C6',
    actionText: 'pH tanah terlalu asam dan tanah jenuh air. Tambahkan kapur pertanian (dolomit) sesuai dosis, namun hentikan penyiraman sementara hingga kelembaban turun ke level aman.',
    needsWater:     false,
    needsLime:      true,
    needsSulfur:    false,
    reduceWatering: true,
  },
  C7: {
    code: 'C7',
    actionText: 'pH tanah terlalu basa/alkali. Tambahkan sulfur elemental sesuai dosis untuk menurunkan pH secara bertahap. Pantau pH ulang setelah 7–10 hari.',
    needsWater:     false,
    needsLime:      false,
    needsSulfur:    true,
    reduceWatering: false,
  },
  C8: {
    code: 'C8',
    actionText: 'pH tanah terlalu basa/alkali DAN tanah kering. Tambahkan sulfur elemental sesuai dosis, kemudian lakukan penyiraman sesuai volume yang direkomendasikan.',
    needsWater:     true,
    needsLime:      false,
    needsSulfur:    true,
    reduceWatering: false,
  },
  C9: {
    code: 'C9',
    actionText: 'pH tanah terlalu basa/alkali DAN tanah jenuh air — kondisi kritis ganda. Tambahkan sulfur elemental sesuai dosis dan segera hentikan penyiraman. Kondisi ini dapat menyebabkan kekurangan zat besi dan kondisi anaerob pada akar.',
    needsWater:     false,
    needsLime:      false,
    needsSulfur:    true,
    reduceWatering: true,
  },
};

function interpretCategory(categoryCode) {
  const category = CATEGORY_LOOKUP[categoryCode];

  if (!category) {
    throw new Error(`Kode kategori tidak valid: "${categoryCode}". Gunakan C1 hingga C9.`);
  }

  return { ...category };
}

module.exports = { CATEGORY_LOOKUP, interpretCategory };
