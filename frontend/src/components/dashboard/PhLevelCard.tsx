import { Card } from "@/components/ui/card";
import { TONES, classifyPh } from "./sensorStatus";

interface PhLevelCardProps {
  value: number | null;
  range: { min: number; max: number };
}

export default function PhLevelCard({ value, range }: PhLevelCardProps) {
  const position =
    value === null ? 0 : Math.min(Math.max((value / 14) * 100, 4), 96);
  const status = value === null ? null : classifyPh(value, range);
  const tone = status ? TONES[status.tone] : null;

  return (
    <Card className="rounded-3xl p-6">
      <h3 className="text-xl font-bold tracking-tight text-neutral-800">
        Tingkat pH Tanah
      </h3>

      <div className="relative mt-6">
        <div className="flex h-10 gap-1 overflow-hidden rounded-full">
          <div className="basis-[36%] bg-gradient-to-r from-red-600 to-orange-400" />
          <div className="basis-[28%] bg-gradient-to-r from-green-500 to-emerald-400" />
          <div className="flex-1 bg-gradient-to-r from-sky-500 to-purple-500" />
        </div>

        {value !== null && (
          <div
            className="absolute top-5 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${position}%` }}
          >
            <span className="h-7 w-0.5 bg-neutral-800" />
            <span className="text-3xl leading-none font-bold text-neutral-800 tabular-nums">
              {value.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-16 flex justify-center">
        {status && tone ? (
          <span
            className={`rounded-full border px-5 py-1 text-lg font-bold ${tone.badgeBg} ${tone.badge} ${tone.border}`}
          >
            {status.label}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Belum ada data</span>
        )}
      </div>
    </Card>
  );
}
