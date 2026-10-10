// Setpoint NMI per tanaman (C501 Step 2). Kunci = nama tanaman huruf kecil.
const PLANT_MOISTURE = {
  selada: { trigger: 65, target: 90 },
  bayam: { trigger: 70, target: 80 },
  pakcoy: { trigger: 60, target: 80 },
};

module.exports = PLANT_MOISTURE;
