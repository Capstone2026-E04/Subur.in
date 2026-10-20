const CATEGORIES = {
  C1: { waterAction: "NONE", phAction: "NONE" },
  C2: { waterAction: "IRRIGATE", phAction: "NONE" },
  C3: { waterAction: "STOP", phAction: "NONE" },
  C4: { waterAction: "NONE", phAction: "LIME" },
  C5: { waterAction: "IRRIGATE", phAction: "LIME" },
  C6: { waterAction: "STOP", phAction: "LIME" },
  C7: { waterAction: "NONE", phAction: "SULFUR" },
  C8: { waterAction: "IRRIGATE", phAction: "SULFUR" },
  C9: { waterAction: "STOP", phAction: "SULFUR" },
};

const RULE_BASE = [
  { id: "R1", phSet: "asam", moistureSet: "kering", category: "C5" },
  { id: "R2", phSet: "asam", moistureSet: "lembap", category: "C4" },
  { id: "R3", phSet: "asam", moistureSet: "jenuh", category: "C6" },
  { id: "R4", phSet: "optimal", moistureSet: "kering", category: "C2" },
  { id: "R5", phSet: "optimal", moistureSet: "lembap", category: "C1" },
  { id: "R6", phSet: "optimal", moistureSet: "jenuh", category: "C3" },
  { id: "R7", phSet: "basa", moistureSet: "kering", category: "C8" },
  { id: "R8", phSet: "basa", moistureSet: "lembap", category: "C7" },
  { id: "R9", phSet: "basa", moistureSet: "jenuh", category: "C9" },
];

// Pusat himpunan konsekuen segitiga pada domain [-1, 1] untuk tiap sumbu tindakan.
const WATER_CENTERS = { STOP: -1, NONE: 0, IRRIGATE: 1 };
const PH_CENTERS = { SULFUR: -1, NONE: 0, LIME: 1 };

module.exports = {
  CATEGORIES,
  RULE_BASE,
  WATER_CENTERS,
  PH_CENTERS,
};
