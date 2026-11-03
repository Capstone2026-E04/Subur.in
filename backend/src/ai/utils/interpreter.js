const { CATEGORIES } = require("../core/rules");

const ACTION_TEXT = {
  C1: "pH dan kelembapan normal. Lanjutkan monitoring.",
  C2: "Media kering. Siram sesuai estimasi volume.",
  C3: "Media hampir basah. Tahan penyiraman dan periksa drainase.",
  C4: "pH terlalu asam. Pertimbangkan dolomit sesuai estimasi dosis.",
  C5: "pH terlalu asam dan media kering. Beri dolomit, lalu siram sesuai estimasi volume.",
  C6: "pH terlalu asam dan media basah. Tahan penyiraman dan periksa drainase; dolomit ditunda.",
  C7: "pH terlalu basa. Pertimbangkan sulfur sesuai estimasi dosis.",
  C8: "pH terlalu basa dan media kering. Beri sulfur, lalu siram sesuai estimasi volume.",
  C9: "pH terlalu basa dan media basah. Tahan penyiraman dan periksa drainase; sulfur ditunda.",
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
