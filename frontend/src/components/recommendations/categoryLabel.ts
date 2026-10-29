const labels: Record<string, string> = {
  C1: "Kondisi optimal",
  C2: "Media kering",
  C3: "Media terlalu basah",
  C4: "Media asam",
  C5: "Media asam dan kering",
  C6: "Media asam dan terlalu basah",
  C7: "Media basa",
  C8: "Media basa dan kering",
  C9: "Media basa dan terlalu basah",
};
export const categoryLabel = (code: string) => labels[code] ?? code;
