"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  fetchSuperadminSensorHistory,
  type DeviceOption,
  type SensorPoint,
} from "@/services/superadminService";

interface SuperadminSensorChartsProps {
  token: string;
  devices: DeviceOption[];
}

const HISTORY_LIMIT = 100;

const formatPointTime = (timestamp: string) =>
  new Date(timestamp).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

interface MetricChartProps {
  title: string;
  dataKey: "ph" | "moisture";
  data: { label: string; ph: number; moisture: number }[];
  domain: [number, number];
  color: string;
  unit: string;
}

function MetricChart({
  title,
  dataKey,
  data,
  domain,
  color,
  unit,
}: MetricChartProps) {
  return (
    <Card className="rounded-3xl p-6">
      <h3 className="text-lg font-bold tracking-tight text-neutral-800">
        {title}
      </h3>
      <div className="mt-4 h-[240px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Belum ada data sensor untuk perangkat ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, left: -16 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e9e7c3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={48}
              />
              <YAxis
                domain={domain}
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value}${unit}`, title]}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export default function SuperadminSensorCharts({
  token,
  devices,
}: SuperadminSensorChartsProps) {
  const [chosenId, setChosenId] = useState("");
  const [history, setHistory] = useState<SensorPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceId = devices.some((d) => d.id === chosenId)
    ? chosenId
    : (devices[0]?.id ?? "");

  useEffect(() => {
    if (!token || !deviceId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchSuperadminSensorHistory(token, deviceId, HISTORY_LIMIT)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setHistory([]);
        setError(
          err instanceof Error ? err.message : "Gagal memuat data sensor.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, deviceId]);

  const data = useMemo(
    () =>
      history.map((point) => ({
        label: formatPointTime(point.timestamp),
        ph: point.ph,
        moisture: point.moisture,
      })),
    [history],
  );

  return (
    <section className="space-y-4" aria-label="Grafik sensor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-neutral-900">Grafik Sensor</h2>
        <div className="flex items-center gap-2">
          <label
            htmlFor="superadmin-chart-device"
            className="text-sm font-medium text-neutral-700"
          >
            Perangkat
          </label>
          <select
            id="superadmin-chart-device"
            value={deviceId}
            onChange={(e) => setChosenId(e.target.value)}
            disabled={devices.length === 0}
            className="focus:ring-primary/30 max-w-[260px] cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-neutral-900 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {devices.length === 0 && (
              <option value="">Tidak ada perangkat</option>
            )}
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label} · {device.user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-rose-600">{error}</p>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 lg:grid-cols-2 ${isLoading ? "opacity-60" : ""}`}
        >
          <MetricChart
            title="Tingkat pH Tanah"
            dataKey="ph"
            data={data}
            domain={[0, 14]}
            color="#2f6f3a"
            unit=""
          />
          <MetricChart
            title="Kelembapan Tanah"
            dataKey="moisture"
            data={data}
            domain={[0, 100]}
            color="#4cb84c"
            unit="%"
          />
        </div>
      )}
    </section>
  );
}
