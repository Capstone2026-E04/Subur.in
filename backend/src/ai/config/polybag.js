// Satu-satunya preset prototipe C501: polybag 30x30 cm, volume media 2 L.
const DIAMETER_CM = 30;

module.exports = {
  name: "STANDAR",
  diameterCm: DIAMETER_CM,
  heightCm: 30,
  volumeLiter: 2,
  areaM2: parseFloat((Math.PI * (DIAMETER_CM / 2 / 100) ** 2).toFixed(5)),
};
