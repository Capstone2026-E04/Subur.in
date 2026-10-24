"use client";

import { MdBarChart } from "react-icons/md";
import { useId, useState } from "react";
import {
  CartesianGrid,
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { SensorHistoryItem } from "@/types/device";

interface SensorTrendCardProps {
  title: string;
  metric: "ph" | "moisture";
  history: SensorHistoryItem[];
  color: string;
}

const RANGES = [
  { hours: 1, label: "1 jam terakhir" },
  { hours: 3, label: "3 jam terakhir" },
  { hours: 6, label: "6 jam terakhir" },
  { hours: 12, label: "12 jam terakhir" },
  { hours: 24, label: "1 hari terakhir" },
  { hours: 72, label: "3 hari terakhir" },
  { hours: 168, label: "7 hari terakhir" },
  { hours: 336, label: "14 hari terakhir" },
  { hours: 720, label: "30 hari terakhir" },
];
const MIN_POINTS = 2;
const MAX_POINTS = 72;
const TIME_ZONE = "Asia/Jakarta";
const TZ_OFFSET_MS = 7 * 3600 * 1000;

const GRANULARITIES = [
  { id: "minute", label: "Menit", ms: 60 * 1000 },
  { id: "10min", label: "10 Menit", ms: 10 * 60 * 1000 },
  { id: "hour", label: "Jam", ms: 3600 * 1000 },
  { id: "day", label: "Hari", ms: 24 * 3600 * 1000 },
] as const;
type Granularity = (typeof GRANULARITIES)[number];

const bucketLabel = (ms: number, g: Granularity) =>
  g.id === "day"
    ? new Date(ms).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        timeZone: TIME_ZONE,
      })
    : new Date(ms).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TIME_ZONE,
      });

function buildAverages(
  history: SensorHistoryItem[],
  metric: "ph" | "moisture",
  g: Granularity,
  points: number,
) {
  const bucketOf = (t: number) => Math.floor((t + TZ_OFFSET_MS) / g.ms);
  const sums = new Map<number, { total: number; count: number }>();
  for (const item of history) {
    const bucket = bucketOf(new Date(item.timestamp).getTime());
    const entry = sums.get(bucket) ?? { total: 0, count: 0 };
    entry.total += item[metric];
    entry.count += 1;
    sums.set(bucket, entry);
  }

  const current = bucketOf(Date.now());
  return Array.from({ length: points }, (_, i) => {
    const bucket = current - (points - 1 - i);
    const entry = sums.get(bucket);
    return {
      label: bucketLabel(bucket * g.ms - TZ_OFFSET_MS, g),
      value: entry ? entry.total / entry.count : null,
    };
  });
}

export default function SensorTrendCard({
  title,
  metric,
  history,
  color,
}: SensorTrendCardProps) {
  const gradientId = useId().replace(/:/g, "");
  const [granularityId, setGranularityId] = useState<string>(
    GRANULARITIES[0].id,
  );
  const [rangeHours, setRangeHours] = useState(RANGES[0].hours);
  const pointsFor = (g: Granularity) => Math.ceil((rangeHours * 3600e3) / g.ms);
  const allowed = GRANULARITIES.filter((g) => {
    const n = pointsFor(g);
    return n >= MIN_POINTS && n <= MAX_POINTS;
  });
  const granularity = allowed.find((g) => g.id === granularityId) ?? allowed[0];
  const points = pointsFor(granularity);
  const data = buildAverages(history, metric, granularity, points);
  const domain: [number, number] = metric === "ph" ? [0, 14] : [0, 100];
  const formatValue = (v: number) =>
    metric === "ph" ? v.toFixed(1) : `${Math.round(v)}%`;

  return (
    <Card className="min-w-0 rounded-2xl border-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900 sm:text-lg">
          <MdBarChart size={24} className="shrink-0 text-[#0b5038]" /> {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Rentang waktu"
            value={rangeHours}
            onChange={(e) => setRangeHours(Number(e.target.value))}
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            {RANGES.map((r) => (
              <option key={r.hours} value={r.hours}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Granularitas waktu"
            value={granularity.id}
            onChange={(e) => setGranularityId(e.target.value)}
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            {allowed.map((g) => (
              <option key={g.id} value={g.id}>
                Per {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 h-48 w-full sm:h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: -20, bottom: 8 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#eef2ef" vertical />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis
              domain={domain}
              ticks={
                metric === "moisture"
                  ? [0, 25, 50, 75, 100]
                  : [0, 3.5, 7, 10.5, 14]
              }
              tickFormatter={formatValue}
              tickLine={false}
              axisLine={false}
              fontSize={10}
              stroke="#64748b"
            />
            <Tooltip
              formatter={(v) => [formatValue(Number(v)), title]}
              labelStyle={{ fontWeight: 700 }}
              contentStyle={{ borderRadius: 12, fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
