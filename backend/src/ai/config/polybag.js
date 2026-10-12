const DIAMETER_CM = 30;

module.exports = {
  name: "STANDAR",
  diameterCm: DIAMETER_CM,
  heightCm: 30,
  volumeLiter: 2,
  areaM2: parseFloat((Math.PI * (DIAMETER_CM / 2 / 100) ** 2).toFixed(5)),
};
