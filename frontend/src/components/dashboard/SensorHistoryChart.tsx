"use client";

import { useEffect, useState, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  MdOutlineTimeline,
  MdRefresh,
  MdOutlineSpa,
  MdOutlineWaterDrop,
  MdCompare,
} from "react-icons/md";
import { fetchSensorHistory } from "@/services/deviceService";
import type { SensorHistoryItem } from "@/types/device";
import { useSensorRealtime } from "@/hooks/useSensorRealtime";
import { Card, CardHeader } from "@/components/ui/card";

interface SensorHistoryChartProps {
  deviceId: string;
  token: string;
  simple?: boolean;
}

type ChartViewMode = "both" | "ph" | "moisture";

function formatChartTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface TooltipPayloadItem {
  name: string;
  stroke: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-black/8 bg-white/95 p-3.5 shadow-xl backdrop-blur-sm">
        <p className="mb-1.5 text-xs font-bold text-gray-500">{label}</p>
        <div className="space-y-1">
          {payload.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.stroke }}
              />
              <span className="text-xs font-semibold text-gray-600">
                {p.name}:
              </span>
              <span className="text-xs font-bold text-gray-800">
                {p.value.toFixed(p.name === "pH" ? 1 : 0)}
                {p.name === "pH" ? "" : "%"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function SensorHistoryChart({
  deviceId,
  token,
  simple = false,
}: SensorHistoryChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [history, setHistory] = useState<SensorHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [limit, setLimit] = useState(simple ? 15 : 20);
  const [viewMode, setViewMode] = useState<ChartViewMode>("both");
  const [error, setError] = useState<string | null>(null);

  const { ph, moisture, lastUpdated } = useSensorRealtime(deviceId, token);

  useEffect(() => {
    if (ph !== null && moisture !== null && lastUpdated) {
      setHistory((prev) => {
        if (prev.some((item) => item.timestamp === lastUpdated)) {
          return prev;
        }
        const newItem: SensorHistoryItem = {
          id: Date.now(),
          deviceId,
          ph,
          moisture,
          timestamp: lastUpdated,
        };
        const updated = [...prev, newItem].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        return updated.slice(-limit);
      });
    }
  }, [ph, moisture, lastUpdated, deviceId, limit]);

  const loadHistory = useCallback(async () => {
    if (!token || !deviceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSensorHistory(token, deviceId, limit);
      const sorted = [...data].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      setHistory(sorted);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat riwayat sensor.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, deviceId, limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  const formattedData = history.map((item) => ({
    ...item,
    timeLabel: formatChartTime(item.timestamp),
  }));

  if (!isMounted) {
    return (
      <Card className="h-96 items-center justify-center">
        <p className="text-sm text-gray-400">Menyiapkan grafik...</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/60 shrink-0 flex-wrap gap-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <MdOutlineTimeline size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-primary text-sm leading-tight font-bold">
              Tren Grafik Sensor
            </h3>
            <p className="text-xs font-medium text-gray-400">
              Riwayat pengukuran berkala waktu ke waktu
            </p>
          </div>
        </div>

        {!simple && (
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-black/5 bg-gray-100 p-0.5 text-xs font-semibold">
              {[
                { id: "both", label: "Semua", Icon: MdCompare },
                { id: "ph", label: "pH", Icon: MdOutlineSpa },
                {
                  id: "moisture",
                  label: "Kelembapan",
                  Icon: MdOutlineWaterDrop,
                },
              ].map((m) => {
                const Icon = m.Icon;
                const isActive = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id as ChartViewMode)}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 transition ${
                      isActive
                        ? "text-primary bg-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <select
              id="chart-limit-select"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="focus:ring-primary cursor-pointer rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 shadow-sm focus:ring-1 focus:outline-none"
            >
              <option value={10}>10 data</option>
              <option value={20}>20 data</option>
              <option value={30}>30 data</option>
              <option value={50}>50 data</option>
            </select>

            <button
              id="refresh-chart-btn"
              onClick={loadHistory}
              disabled={isLoading}
              className="hover:text-primary flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
              aria-label="Segarkan riwayat sensor"
            >
              <MdRefresh
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
        )}
      </CardHeader>

      <div
        className={`flex-1 p-5 ${simple ? "min-h-[220px]" : "min-h-[320px]"} relative`}
      >
        {isLoading && history.length === 0 ? (
          <div className="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-white/70">
            <p className="text-sm font-semibold text-gray-500">
              Memuat riwayat...
            </p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-rose-600">⚠ {error}</p>
            <button
              onClick={loadHistory}
              className="text-primary mt-3 text-xs font-bold hover:underline"
            >
              Coba Lagi
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-sm font-semibold text-gray-400">
              Belum ada riwayat data tercatat untuk perangkat ini.
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-400">
              Data sensor akan tersimpan ke riwayat secara otomatis setelah
              perangkat ESP32 Anda mulai mengirimkan data sensor berkala.
            </p>
          </div>
        ) : null}

        {history.length > 0 && (
          <div className={simple ? "h-[180px] w-full" : "h-[300px] w-full"}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />

                {viewMode === "ph" || viewMode === "both" ? (
                  <YAxis
                    yAxisId="ph-axis"
                    domain={[0, 14]}
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                ) : null}

                {viewMode === "moisture" ? (
                  <YAxis
                    yAxisId="moisture-axis"
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                ) : viewMode === "both" ? (
                  <YAxis
                    yAxisId="moisture-axis"
                    orientation="right"
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    dx={10}
                  />
                ) : null}

                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#475569",
                  }}
                />

                {(viewMode === "ph" || viewMode === "both") && (
                  <Line
                    yAxisId="ph-axis"
                    type="monotone"
                    dataKey="ph"
                    name="pH"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}

                {(viewMode === "moisture" || viewMode === "both") && (
                  <Line
                    yAxisId="moisture-axis"
                    type="monotone"
                    dataKey="moisture"
                    name="Kelembapan"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
