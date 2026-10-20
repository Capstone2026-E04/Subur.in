import { Card } from "@/components/ui/card";
import { TONES, classifyNmi, classifyVwc } from "./sensorStatus";

interface MoistureLevelCardProps {
  value: number | null;
  nmiTrigger: number | null;
  nmiTarget?: number | null;
  moistureType?: "legacy_index" | "vwc_percent";
}

const CX = 100;
const CY = 100;
const NEEDLE_INNER = 62;
const NEEDLE_OUTER = 100;

export default function MoistureLevelCard({
  value,
  nmiTrigger,
  nmiTarget = null,
  moistureType = "legacy_index",
}: MoistureLevelCardProps) {
  const pct = value === null ? 0 : Math.min(Math.max(value, 0), 100);
  const angle = Math.PI * (1 - pct / 100);
  const needle = {
    x1: CX + NEEDLE_INNER * Math.cos(angle),
    y1: CY - NEEDLE_INNER * Math.sin(angle),
    x2: CX + NEEDLE_OUTER * Math.cos(angle),
    y2: CY - NEEDLE_OUTER * Math.sin(angle),
  };
  const isVwc = moistureType === "vwc_percent";
  const status =
    value === null
      ? null
      : isVwc
        ? classifyVwc(value, nmiTrigger, nmiTarget)
        : classifyNmi(value, nmiTrigger);
  const tone = status ? TONES[status.tone] : null;

  return (
    <Card className="rounded-3xl p-6">
      <h3 className="text-xl font-bold tracking-tight text-neutral-800">
        {isVwc ? "Kelembapan Tanah (VWC)" : "Kelembapan Tanah"}
      </h3>

      <div className="relative mx-auto mt-3 w-full max-w-[240px]">
        <svg viewBox="0 0 200 110" className="w-full" aria-hidden>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={30}
            pathLength={100}
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#2f6f3a"
            strokeWidth={30}
            pathLength={100}
            strokeDasharray={`${pct} 100`}
          />
          {value !== null && (
            <line {...needle} stroke="#1f2937" strokeWidth={3} />
          )}
        </svg>
        <span className="absolute inset-x-0 bottom-0 text-center text-4xl leading-none font-bold text-neutral-800 tabular-nums">
          {value === null
            ? "—"
            : isVwc
              ? `${value.toFixed(1)}%`
              : `${Math.round(value)}%`}
        </span>
      </div>

      <div className="mt-5 flex justify-center">
        {status && tone && (
          <span
            className={`rounded-full border px-5 py-1 text-lg font-bold ${tone.badgeBg} ${tone.badge} ${tone.border}`}
          >
            {status.label}
          </span>
        )}
      </div>
    </Card>
  );
}
