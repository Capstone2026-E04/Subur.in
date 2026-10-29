import { MdWaterDrop } from "react-icons/md";
import { Card } from "@/components/ui/card";
import { TONES, classifyVwc, toVwcDisplay } from "./sensorStatus";

interface MoistureLevelCardProps {
  value: number | null;
  vwcTrigger: number | null;
  moistureType?: "legacy_index" | "vwc_percent";
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

export default function MoistureLevelCard({
  value,
  vwcTrigger,
  moistureType = "legacy_index",
}: MoistureLevelCardProps) {
  const vwc =
    value !== null && moistureType === "vwc_percent"
      ? toVwcDisplay(value)
      : null;
  const status =
    vwc ?? (value === null ? null : classifyVwc(value, vwcTrigger));
  const tone = status ? TONES[status.tone] : null;
  const displayValue = vwc ? vwc.mainPercent : value;
  const position = Math.min(Math.max(vwc?.gaugeFill ?? value ?? 0, 2), 98);

  return (
    <Card className="min-w-0 rounded-2xl border-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
      <h3 className="flex min-h-10 items-center gap-2 text-xs font-medium text-neutral-900 sm:min-h-7 sm:text-lg">
        <MdWaterDrop size={24} className="shrink-0 text-sky-400" /> Kelembapan
        Tanah
      </h3>
      <div className="mt-3 flex min-h-24 flex-col items-start justify-start gap-2 sm:min-h-28 xl:min-h-12 xl:flex-row xl:items-center xl:gap-4">
        <p className="text-2xl font-bold tracking-tight whitespace-nowrap text-neutral-900 tabular-nums sm:text-5xl">
          {displayValue === null
            ? "--"
            : vwc
              ? `${displayValue}% CC`
              : `${Math.round(displayValue)}%`}
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
      <p className="mt-1 h-4 text-[10px] text-neutral-500 sm:text-xs">
        {vwc?.vwcPercent != null
          ? `VWC ${vwc.vwcPercent.toFixed(1).replace(".", ",")}%`
          : "Indeks kelembapan"}
      </p>
      <div className="to-primary/10 relative mt-5 h-2.5 rounded-full bg-linear-to-r from-orange-500 via-yellow-200 sm:mt-6 sm:h-3.5">
        {displayValue !== null && (
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-orange-400 shadow-md sm:h-5 sm:w-5"
            style={{ left: `${position}%` }}
          />
        )}
      </div>
      <div className="mt-3 flex justify-between text-[9px] text-neutral-500 sm:text-xs">
        {[0, 25, 50, 75, 100].map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="mt-3 grid min-h-8 grid-cols-3 items-start gap-1 text-[9px] leading-tight font-medium sm:text-xs">
        <span className="text-left text-orange-600">Kering</span>
        <span className="text-primary text-center">Optimal</span>
        <span className="text-right text-sky-700">Jenuh/basah</span>
      </div>
      <p className="mt-2 min-h-8 text-[9px] text-neutral-400 sm:text-xs">
        {moistureType === "vwc_percent"
          ? "Persentase kapasitas kontainer (% CC)"
          : "Indeks kelembapan"}
      </p>
    </Card>
  );
}
