export function formatTimestamp(ts: string | null): string {
  if (!ts) return "Belum ada data";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

export const TONES = {
  red: {
    badge: "text-red-700",
    badgeBg: "bg-red-100",
    border: "border-red-400",
  },
  orange: {
    badge: "text-orange-700",
    badgeBg: "bg-orange-100",
    border: "border-orange-400",
  },
  amber: {
    badge: "text-amber-700",
    badgeBg: "bg-amber-100",
    border: "border-amber-400",
  },
  green: {
    badge: "text-emerald-700",
    badgeBg: "bg-emerald-100",
    border: "border-emerald-400",
  },
  sky: {
    badge: "text-sky-700",
    badgeBg: "bg-sky-100",
    border: "border-sky-400",
  },
  violet: {
    badge: "text-violet-700",
    badgeBg: "bg-violet-100",
    border: "border-violet-400",
  },
} as const;

export type Tone = keyof typeof TONES;

const PH_MARGIN = 0.5;

export const DEFAULT_PH_RANGE = { min: 6, max: 7 };

export function classifyPh(ph: number, range: { min: number; max: number }) {
  if (ph < range.min - PH_MARGIN)
    return { label: "Asam", tone: "orange" as Tone };
  if (ph < range.min) return { label: "Mendekati asam", tone: "amber" as Tone };
  if (ph <= range.max) return { label: "Optimal", tone: "green" as Tone };
  if (ph <= range.max + PH_MARGIN) {
    return { label: "Mendekati basa", tone: "amber" as Tone };
  }
  return { label: "Basa", tone: "violet" as Tone };
}

const THETA_CC_PERCENT = 32.98;

export const CC_OPTIMAL_MIN = 66.9;
export const CC_OPTIMAL_MAX = 116.7;
export const CC_GAUGE_MAX = 133.3;

// Sensor dan backend menyimpan kelembapan sebagai persen kadar air tanah;
// dashboard selalu menampilkannya sebagai persen kapasitas media.
export const vwcToCc = (vwcPercent: number) =>
  (vwcPercent / THETA_CC_PERCENT) * 100;

export function toVwcDisplay(vwcPercent: number) {
  if (vwcPercent <= 0) {
    return {
      mainPercent: null,
      vwcPercent: null,
      gaugeFill: 0,
      label: "sensor_out_of_range",
      tone: "red" as Tone,
    };
  }
  const rwc = (vwcPercent / THETA_CC_PERCENT) * 100;
  let label = "Sangat kering";
  let tone: Tone = "red";
  if (rwc >= 50) [label, tone] = ["Kering", "orange"];
  if (rwc >= CC_OPTIMAL_MIN) [label, tone] = ["Lembap", "sky"];
  if (rwc >= 90) [label, tone] = ["Lembap penuh", "green"];
  if (rwc >= 100) [label, tone] = ["Penuh", "green"];
  if (rwc >= CC_OPTIMAL_MAX) [label, tone] = ["Jenuh", "violet"];
  return {
    mainPercent: Math.round(rwc),
    vwcPercent,
    gaugeFill: Math.min((rwc / CC_GAUGE_MAX) * 100, 100),
    label,
    tone,
  };
}
