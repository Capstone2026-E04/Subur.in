const { CATEGORIES } = require("../core/rules");

const ACTION_TEXT = {
  C1: "Kondisi pH dan kelembapan dalam rentang operasional. Tidak ada treatment; lanjutkan monitoring.",
  C2: "pH sesuai, media kering. Lakukan penyiraman sesuai estimasi volume.",
  C3: "pH sesuai, media mendekati basah. Hentikan penyiraman sementara dan periksa drainase.",
  C4: "pH media terlalu asam. Pertimbangkan dolomit sesuai estimasi dosis.",
  C5: "pH media terlalu asam dan media kering. Pertimbangkan dolomit, lalu siram sesuai estimasi volume.",
  C6: "pH media terlalu asam dan media basah. Hentikan penyiraman dan periksa drainase; koreksi dolomit dicatat dan ditunda.",
  C7: "pH media terlalu basa. Pertimbangkan sulfur elemental sesuai estimasi dosis.",
  C8: "pH media terlalu basa dan media kering. Pertimbangkan sulfur elemental, lalu siram sesuai estimasi volume.",
  C9: "pH media terlalu basa dan media basah. Hentikan penyiraman dan periksa drainase; koreksi sulfur dicatat dan ditunda.",
};

function interpretCategory(categoryCode) {
  const category = CATEGORIES[categoryCode];
  if (!category) {
    throw new Error(
      `Kode kategori tidak valid: "${categoryCode}". Gunakan C1 hingga C9.`,
    );
  }
  return {
    code: categoryCode,
    ...category,
    actionText: ACTION_TEXT[categoryCode],
  };
}

module.exports = { ACTION_TEXT, interpretCategory };
