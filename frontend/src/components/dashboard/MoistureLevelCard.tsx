import { MdWaterDrop } from "react-icons/md";
import { Card } from "@/components/ui/card";
import {
  CC_GAUGE_MAX,
  CC_OPTIMAL_MAX,
  CC_OPTIMAL_MIN,
  TONES,
  formatMeasuredAt,
  toVwcDisplay,
} from "./sensorStatus";

interface MoistureLevelCardProps {
  value: number | null;
  measuredAt?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  "Sangat kering": "Kering",
  Kering: "Kering",
  "Mendekati kering": "Kering",
  Lembap: "Optimal",
  "Lembap penuh": "Optimal",
  Penuh: "Optimal",
  Optimal: "Optimal",
  "Mendekati basah": "Jenuh/basah",
  Basah: "Jenuh/basah",
  Jenuh: "Jenuh/basah",
};

const toPct = (cc: number) => (cc / CC_GAUGE_MAX) * 100;
const OPTIMAL_START = toPct(CC_OPTIMAL_MIN);
const OPTIMAL_END = toPct(CC_OPTIMAL_MAX);
const GAUGE_GRADIENT = `linear-gradient(to right, #fdba74 ${OPTIMAL_START / 2}%, #6ee7b7 ${(OPTIMAL_START + OPTIMAL_END) / 2}%, #c4b5fd ${(OPTIMAL_END + 100) / 2}%)`;

export default function MoistureLevelCard({
  value,
  measuredAt: measuredAtIso = null,
}: MoistureLevelCardProps) {
  const measuredAt = value === null ? null : formatMeasuredAt(measuredAtIso);
  const status = value === null ? null : toVwcDisplay(value);
  const tone = status ? TONES[status.tone] : null;
  const displayValue = status ? status.mainPercent : null;
  const position = Math.min(Math.max(status?.gaugeFill ?? 0, 2), 98);

  return (
    <Card className="min-w-0 rounded-2xl border-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
      <h3 className="flex min-h-8 items-center gap-1.5 text-xs font-medium text-neutral-900 sm:min-h-7 sm:gap-2 sm:text-lg">
        <MdWaterDrop size={24} className="shrink-0 text-sky-400" /> Kelembapan
        Tanah
      </h3>
      <div className="mt-2 flex min-h-16 flex-col items-start justify-start gap-2 sm:mt-3 sm:min-h-28 xl:min-h-12 xl:flex-row xl:items-center xl:gap-4">
        <p className="text-2xl font-bold tracking-tight whitespace-nowrap text-neutral-900 tabular-nums sm:text-5xl">
          {displayValue === null ? "--" : `${displayValue}%`}
        </p>
        {status && tone ? (
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-medium sm:px-4 sm:text-sm ${tone.badgeBg} ${tone.badge}`}
          >
            {STATUS_LABELS[status.label] ?? status.label}
          </span>
        ) : (
          <span className="text-xs text-neutral-400">Belum ada data</span>
        )}
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full sm:mt-6 sm:h-3.5"
        style={{ background: GAUGE_GRADIENT }}
      />
      {displayValue !== null && (
        <div className="relative h-0">
          <span
            className="absolute -top-3 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-neutral-800 shadow-md sm:-top-4 sm:h-5 sm:w-5"
            style={{ left: `${position}%` }}
          />
        </div>
      )}
      <div className="relative mt-2 h-3 text-[9px] text-neutral-500 sm:mt-3 sm:text-xs">
        <span className="absolute left-0">0</span>
        {[CC_OPTIMAL_MIN, CC_OPTIMAL_MAX].map((cc) => (
          <span
            key={cc}
            className="absolute -translate-x-1/2"
            style={{ left: `${toPct(cc)}%` }}
          >
            {Math.round(cc)}
          </span>
        ))}
      </div>
      <div className="relative mt-1 h-6 text-[9px] leading-tight font-medium sm:h-5 sm:text-xs">
        <span
          className="absolute -translate-x-1/2 text-orange-600"
          style={{ left: `${OPTIMAL_START / 2}%` }}
        >
          Kering
        </span>
        <span
          className="text-primary absolute -translate-x-1/2"
          style={{ left: `${(OPTIMAL_START + OPTIMAL_END) / 2}%` }}
        >
          Optimal
        </span>
        <span className="absolute right-0 text-right text-violet-700">
          Jenuh/
          <br className="sm:hidden" />
          basah
        </span>
      </div>
      {measuredAt && (
        <p className="mt-2 text-[9px] text-neutral-400 sm:mt-3 sm:text-xs">
          {measuredAt}
        </p>
      )}
    </Card>
  );
}
