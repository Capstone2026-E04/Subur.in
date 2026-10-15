"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import type { SensorHistoryItem } from "@/types/device";

interface SensorTrendCardProps {
  title: string;
  metric: "ph" | "moisture";
  history: SensorHistoryItem[];
  currentValue: number | null;
  color: string;
}

const DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const TIME_ZONE = "Asia/Jakarta";

const dayKey = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
const dayLabel = (d: Date) =>
  d.toLocaleDateString("id-ID", { weekday: "short", timeZone: TIME_ZONE });

function buildDailyAverages(
  history: SensorHistoryItem[],
  metric: "ph" | "moisture",
) {
  const sums = new Map<string, { total: number; count: number }>();
  for (const item of history) {
    const key = dayKey(new Date(item.timestamp));
    const entry = sums.get(key) ?? { total: 0, count: 0 };
    entry.total += item[metric];
    entry.count += 1;
    sums.set(key, entry);
  }

  const now = Date.now();
  return Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(now - (DAYS - 1 - i) * DAY_MS);
    const entry = sums.get(dayKey(date));
    return {
      label: dayLabel(date),
      value: entry ? entry.total / entry.count : null,
    };
  });
}

export default function SensorTrendCard({
  title,
  metric,
  history,
  currentValue,
  color,
}: SensorTrendCardProps) {
  const data = buildDailyAverages(history, metric);
  const domain: [number, number] = metric === "ph" ? [0, 14] : [0, 100];
  const display =
    currentValue === null
      ? "—"
      : metric === "ph"
        ? currentValue.toFixed(1)
        : `${Math.round(currentValue)}%`;

  return (
    <Card className="rounded-3xl p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-neutral-800">
          {title}
        </h3>
        <span className="text-lg font-bold tabular-nums" style={{ color }}>
          {display}
        </span>
      </div>

      <div className="mt-4 h-[200px] w-full">
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
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={3}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
