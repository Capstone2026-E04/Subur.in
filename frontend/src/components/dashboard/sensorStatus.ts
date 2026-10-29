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
const VWC_MARGIN = 5;
const VWC_WET_START = 90;
const VWC_WET_STOP = 95;

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
  if (rwc >= 66.9) [label, tone] = ["Lembap", "sky"];
  if (rwc >= 90) [label, tone] = ["Lembap penuh", "green"];
  if (rwc >= 100) [label, tone] = ["Penuh", "green"];
  if (rwc >= 116.7) [label, tone] = ["Jenuh", "violet"];
  return {
    mainPercent: Math.round(rwc),
    vwcPercent,
    gaugeFill: Math.min(rwc, 100),
    label,
    tone,
  };
}

export function classifyVwc(vwc: number, trigger: number | null) {
  if (trigger === null)
    return { label: "Tanpa parameter", tone: "sky" as Tone };
  if (vwc <= trigger - VWC_MARGIN)
    return { label: "Kering", tone: "red" as Tone };
  if (vwc < trigger + VWC_MARGIN) {
    return { label: "Mendekati kering", tone: "amber" as Tone };
  }
  if (vwc <= VWC_WET_START) return { label: "Optimal", tone: "sky" as Tone };
  if (vwc < VWC_WET_STOP) {
    return { label: "Mendekati basah", tone: "violet" as Tone };
  }
  return { label: "Basah", tone: "violet" as Tone };
}
