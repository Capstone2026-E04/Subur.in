"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
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

const POINT_OPTIONS = [5, 10, 20, 30];
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
  const [granularity, setGranularity] = useState<Granularity>(GRANULARITIES[0]);
  const [points, setPoints] = useState(POINT_OPTIONS[1]);
  const data = buildAverages(history, metric, granularity, points);
  const domain: [number, number] = metric === "ph" ? [0, 14] : [0, 100];
  const formatValue = (v: number) =>
    metric === "ph" ? v.toFixed(1) : `${Math.round(v)}%`;

  return (
    <Card className="rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-neutral-800">
          {title}
        </h3>
        <div className="flex gap-2">
          <select
            aria-label="Jumlah data terakhir"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            {POINT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} data terakhir
              </option>
            ))}
          </select>
          <select
            aria-label="Granularitas waktu"
            value={granularity.id}
            onChange={(e) =>
              setGranularity(
                GRANULARITIES.find((g) => g.id === e.target.value) ??
                  GRANULARITIES[0],
              )
            }
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none"
          >
            {GRANULARITIES.map((g) => (
              <option key={g.id} value={g.id}>
                Per {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 h-50 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, left: 16 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e9e7c3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="#6b7280"
              fontSize={13}
              tickLine={false}
              axisLine={false}
              dy={8}
            />
            <YAxis hide domain={domain} />
            <Tooltip
              formatter={(v) => [formatValue(Number(v)), title]}
              labelStyle={{ fontWeight: 700 }}
              contentStyle={{ borderRadius: 12, fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 7, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
