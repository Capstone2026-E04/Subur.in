// Kategori treatment C1-C9 = kombinasi WaterAction x pHAction (C501 Step 5).
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

// Rule base 3x3 (pH x kelembapan).
const RULE_BASE = [
  { id: "R1", phSet: "asam", moistureSet: "kering", category: "C5" },
  { id: "R2", phSet: "asam", moistureSet: "optimal", category: "C4" },
  { id: "R3", phSet: "asam", moistureSet: "basah", category: "C6" },
  { id: "R4", phSet: "optimal", moistureSet: "kering", category: "C2" },
  { id: "R5", phSet: "optimal", moistureSet: "optimal", category: "C1" },
  { id: "R6", phSet: "optimal", moistureSet: "basah", category: "C3" },
  { id: "R7", phSet: "basa", moistureSet: "kering", category: "C8" },
  { id: "R8", phSet: "basa", moistureSet: "optimal", category: "C7" },
  { id: "R9", phSet: "basa", moistureSet: "basah", category: "C9" },
];

// Urutan prioritas saat nilai agregasi seri (indeks kecil menang).
const WATER_PRIORITY = ["STOP", "NONE", "IRRIGATE"];
const PH_PRIORITY = ["NONE", "LIME", "SULFUR"];

module.exports = { CATEGORIES, RULE_BASE, WATER_PRIORITY, PH_PRIORITY };
