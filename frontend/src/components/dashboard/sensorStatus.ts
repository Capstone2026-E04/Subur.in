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
const NMI_MARGIN = 5;
const NMI_WET_START = 90;
const NMI_WET_STOP = 95;

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

// Batas atas VWC lembap = 7/6 x theta_CC (0,3298); di atasnya JENUH mulai aktif.
const VWC_WET_START = 38.48;

export function classifyVwc(
  vwc: number,
  trigger: number | null,
  target: number | null,
) {
  if (trigger === null || target === null)
    return { label: "Tanpa parameter", tone: "sky" as Tone };
  if (vwc < trigger) return { label: "Kering", tone: "red" as Tone };
  if (vwc < target) {
    return { label: "Mendekati kering", tone: "amber" as Tone };
  }
  if (vwc <= VWC_WET_START) return { label: "Lembap", tone: "sky" as Tone };
  return { label: "Basah", tone: "violet" as Tone };
}

export function classifyNmi(nmi: number, trigger: number | null) {
  if (trigger === null)
    return { label: "Tanpa parameter", tone: "sky" as Tone };
  if (nmi <= trigger - NMI_MARGIN)
    return { label: "Kering", tone: "red" as Tone };
  if (nmi < trigger + NMI_MARGIN) {
    return { label: "Mendekati kering", tone: "amber" as Tone };
  }
  if (nmi <= NMI_WET_START) return { label: "Optimal", tone: "sky" as Tone };
  if (nmi < NMI_WET_STOP) {
    return { label: "Mendekati basah", tone: "violet" as Tone };
  }
  return { label: "Basah", tone: "violet" as Tone };
}
