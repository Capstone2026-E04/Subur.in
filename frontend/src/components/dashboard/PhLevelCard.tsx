import Link from "next/link";
import { MdScience } from "react-icons/md";
import { Card } from "@/components/ui/card";
import { TONES, classifyPh } from "./sensorStatus";

interface PhLevelCardProps {
  value: number | null;
  range: { min: number; max: number };
}

export default function PhLevelCard({ value, range }: PhLevelCardProps) {
  const axisMin = 4;
  const axisMax = 10;
  const toPosition = (ph: number) =>
    Math.min(Math.max(((ph - axisMin) / (axisMax - axisMin)) * 100, 0), 100);
  const position =
    value === null ? 0 : Math.min(Math.max(toPosition(value), 2), 98);
  const status = value === null ? null : classifyPh(value, range);
  const tone = status ? TONES[status.tone] : null;
  const isAlkaline = value !== null && value > range.max;
  const badgeTone = isAlkaline
    ? "bg-sky-100 text-sky-700"
    : `${tone?.badgeBg ?? ""} ${tone?.badge ?? ""}`;
  const markerTone = isAlkaline
    ? "text-sky-500"
    : (tone?.badge ?? "text-neutral-400");
  const minPosition = toPosition(range.min);
  const maxPosition = toPosition(range.max);
  const transitionStart = toPosition(range.min - 0.5);
  const transitionEnd = toPosition(range.max + 0.5);

  return (
    <Link
      href="/dashboard/recommendations#panduan-ph"
      scroll={false}
      aria-label="Lihat panduan pH"
      className="block min-w-0 rounded-2xl transition-shadow hover:shadow-md sm:rounded-3xl"
    >
      <Card className="h-full min-w-0 rounded-2xl border-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
        <h3 className="flex min-h-10 items-center gap-2 text-xs font-medium text-neutral-900 sm:min-h-7 sm:text-lg">
          <MdScience size={24} className="text-primary shrink-0" /> pH Tanah
        </h3>
        <div className="mt-3 flex min-h-24 flex-col items-start justify-start gap-2 sm:min-h-28 xl:min-h-12 xl:flex-row xl:items-center xl:gap-4">
          <p className="text-2xl font-bold tracking-tight whitespace-nowrap text-neutral-900 tabular-nums sm:text-5xl">
            {value === null ? "--" : value.toFixed(1).replace(".", ",")}
          </p>
          {status && tone ? (
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-medium sm:px-4 sm:text-sm ${badgeTone}`}
            >
              {status.label}
            </span>
          ) : (
            <span className="text-xs text-neutral-400">Belum ada data</span>
          )}
        </div>
        <p className="mt-1 h-4 text-[10px] text-neutral-500 sm:text-xs">
          Optimal: {range.min.toLocaleString("id-ID")} -{" "}
          {range.max.toLocaleString("id-ID")}
        </p>
        <div
          className="relative mt-5 h-2.5 rounded-full sm:mt-6 sm:h-3.5"
          style={{
            background: `linear-gradient(to right, #ef4444 0%, #f59e0b ${transitionStart}%, #4ade80 ${minPosition}%, #22c55e ${maxPosition}%, #38bdf8 ${transitionEnd}%, #2563eb 100%)`,
          }}
        >
          {value !== null && (
            <span
              className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-current shadow-md sm:h-5 sm:w-5 ${markerTone}`}
              style={{ left: `${position}%` }}
            />
          )}
        </div>

        <div className="mt-3 flex justify-between text-[9px] text-neutral-500 sm:text-xs">
          {[4, 5, 6, 7, 8, 9, 10].map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
        <div className="mt-3 grid min-h-8 grid-cols-3 items-start gap-1 text-[9px] leading-tight font-medium sm:text-xs">
          <span className="text-left text-red-600">Asam</span>
          <span className="text-primary text-center">Optimal</span>
          <span className="text-right text-sky-700">Basa</span>
        </div>
        <p className="mt-2 min-h-8 text-[9px] text-neutral-400 sm:text-xs">
          Skala tampilan pH 4-10
        </p>
      </Card>
    </Link>
  );
}
