const DIAMETER_CM = 25;

module.exports = {
  name: "STANDAR",
  diameterCm: DIAMETER_CM,
  heightCm: 25,
  volumeLiter: 2,
  areaM2: parseFloat((Math.PI * (DIAMETER_CM / 2 / 100) ** 2).toFixed(5)),
};
