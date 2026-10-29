"use client";

import { MdBarChart } from "react-icons/md";
import { useEffect, useId, useRef, useState } from "react";
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
import { fetchSensorTrend } from "@/services/deviceService";
import type { SensorTrendPoint } from "@/types/device";

interface SensorTrendCardProps {
  title: string;
  metric: "ph" | "moisture";
  deviceId: string;
  token: string;
  color: string;
}

const MAX_POINTS = 72;
const MAX_RANGE_DAYS = 365;
const DEFAULT_SPAN_MS = 3600e3;
const LIVE_REFRESH_MS = 30e3;
const TIME_ZONE = "Asia/Jakarta";
const TZ_OFFSET_MS = 7 * 3600 * 1000;

const GRANULARITIES = [
  { id: "minute", label: "menit", ms: 60 * 1000 },
  { id: "10min", label: "10 menit", ms: 10 * 60 * 1000 },
  { id: "hour", label: "jam", ms: 3600 * 1000 },
  { id: "day", label: "hari", ms: 24 * 3600 * 1000 },
] as const;
type Granularity = (typeof GRANULARITIES)[number];

const pickGranularity = (spanMs: number): Granularity =>
  GRANULARITIES.find((g) => Math.ceil(spanMs / g.ms) <= MAX_POINTS) ??
  GRANULARITIES[GRANULARITIES.length - 1];

const toInputValue = (ms: number) =>
  new Date(ms - new Date(ms).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

const bucketLabel = (ms: number, g: Granularity, withDate: boolean) => {
  if (g.id === "day") {
    return new Date(ms).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      timeZone: TIME_ZONE,
    });
  }
  return new Date(ms).toLocaleString("id-ID", {
    ...(withDate && { day: "2-digit", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  });
};

function buildSeries(
  points: SensorTrendPoint[],
  metric: "ph" | "moisture",
  g: Granularity,
  fromMs: number,
  toMs: number,
) {
  const bucketOf = (t: number) => Math.floor((t + TZ_OFFSET_MS) / g.ms);
  const values = new Map(
    points.map((p) => [bucketOf(new Date(p.timestamp).getTime()), p[metric]]),
  );
  const first = bucketOf(fromMs);
  const last = bucketOf(toMs);
  const withDate = toMs - fromMs > 24 * 3600e3;
  return Array.from({ length: last - first + 1 }, (_, i) => ({
    label: bucketLabel((first + i) * g.ms - TZ_OFFSET_MS, g, withDate),
    value: values.get(first + i) ?? null,
  }));
}

export default function SensorTrendCard({
  title,
  metric,
  deviceId,
  token,
  color,
}: SensorTrendCardProps) {
  const gradientId = useId().replace(/:/g, "");
  const spanRef = useRef(DEFAULT_SPAN_MS);
  const [live, setLive] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const filterId = useId();
  const [from, setFrom] = useState(() =>
    toInputValue(Date.now() - DEFAULT_SPAN_MS),
  );
  const [to, setTo] = useState(() => toInputValue(Date.now()));
  const [refreshKey, setRefreshKey] = useState(0);
  const [points, setPoints] = useState<SensorTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const spanMs = toMs - fromMs;
  const rangeError = Number.isNaN(spanMs)
    ? "Isi tanggal dan pukul mulai serta akhir."
    : spanMs <= 0
      ? "Waktu mulai harus sebelum waktu akhir."
      : spanMs > MAX_RANGE_DAYS * 24 * 3600e3
        ? `Rentang maksimal ${MAX_RANGE_DAYS} hari.`
        : null;
  const granularity = pickGranularity(rangeError ? DEFAULT_SPAN_MS : spanMs);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      const end = Date.now();
      setTo(toInputValue(end));
      setFrom(toInputValue(end - spanRef.current));
      setRefreshKey((k) => k + 1);
    }, LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(() => {
    if (!token || !deviceId || rangeError) return;
    let cancelled = false;
    const end = live ? Date.now() : new Date(to).getTime();
    setIsLoading(true);
    setError(null);
    fetchSensorTrend(token, deviceId, {
      from: new Date(from),
      to: new Date(end),
      bucketSeconds: granularity.ms / 1000,
    })
      .then((data) => {
        if (!cancelled) setPoints(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPoints([]);
        setError(
          err instanceof Error ? err.message : "Gagal memuat riwayat sensor.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, deviceId, from, to, live, refreshKey, rangeError, granularity]);

  const editRange = (next: { from?: string; to?: string }) => {
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    const span = new Date(nextTo).getTime() - new Date(nextFrom).getTime();
    if (span > 0) spanRef.current = span;
    setLive(false);
    setFrom(nextFrom);
    setTo(nextTo);
  };

  const resetToLatest = () => {
    spanRef.current = DEFAULT_SPAN_MS;
    const end = Date.now();
    setFrom(toInputValue(end - DEFAULT_SPAN_MS));
    setTo(toInputValue(end));
    setLive(true);
  };

  const data = rangeError
    ? []
    : buildSeries(points, metric, granularity, fromMs, toMs);
  const domain: [number, number] = metric === "ph" ? [0, 14] : [0, 100];
  const formatValue = (v: number) =>
    metric === "ph" ? v.toFixed(1) : `${Math.round(v)}%`;
  const inputClass =
    "min-w-0 w-full rounded-xl border border-neutral-200 bg-white px-2 py-1.5 text-xs font-semibold text-neutral-600 focus:outline-none";

  return (
    <Card className="min-w-0 rounded-2xl border-white p-3 shadow-sm sm:rounded-3xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-neutral-900 sm:text-lg">
          <MdBarChart size={24} className="text-primary shrink-0" /> {title}
        </h3>
        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls={filterId}
          onClick={() => setShowFilters(!showFilters)}
          className="text-primary shrink-0 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium"
        >
          Periode
        </button>
        <div
          id={filterId}
          className={`${showFilters ? "grid" : "hidden"} w-full min-w-0 grid-cols-1 gap-2 min-[400px]:grid-cols-2`}
        >
          <label className="flex min-w-0 flex-col items-start gap-1 text-xs font-semibold text-neutral-500 sm:flex-row sm:items-center">
            Mulai
            <input
              type="datetime-local"
              value={from}
              max={to}
              onChange={(e) => editRange({ from: e.target.value })}
              className={inputClass}
            />
          </label>
          <label className="flex min-w-0 flex-col items-start gap-1 text-xs font-semibold text-neutral-500 sm:flex-row sm:items-center">
            Akhir
            <input
              type="datetime-local"
              value={to}
              min={from}
              onChange={(e) => editRange({ to: e.target.value })}
              className={inputClass}
            />
          </label>
          {!live && (
            <button
              type="button"
              onClick={resetToLatest}
              className="text-primary cursor-pointer text-xs font-bold hover:underline"
            >
              Terbaru
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-xs font-medium text-neutral-400">
        {rangeError ?? `Rata-rata per ${granularity.label}`}
        {isLoading && !rangeError ? " · memuat..." : ""}
      </p>
      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
      )}

      <div className="mt-3 h-40 w-full sm:h-60">
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
