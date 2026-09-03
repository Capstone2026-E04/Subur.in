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
        <p className="text-xs font-bold text-gray-500 mb-1.5">{label}</p>
        <div className="space-y-1">
          {payload.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.stroke }}
              />
              <span className="text-xs text-gray-600 font-semibold">{p.name}:</span>
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

  // Hubungkan ke hook real-time SSE
  const { ph, moisture, lastUpdated } = useSensorRealtime(deviceId);

  // Efek untuk menyinkronkan data real-time ke dalam riwayat grafik secara dinamis
  useEffect(() => {
    if (ph !== null && moisture !== null && lastUpdated) {
      setHistory((prev) => {
        // Hindari duplikasi data jika data dengan timestamp yang sama sudah ada
        if (prev.some((item) => item.timestamp === lastUpdated)) {
          return prev;
        }
        const newItem: SensorHistoryItem = {
          id: Date.now(), // Gunakan timestamp sebagai ID unik lokal
          deviceId,
          ph,
          moisture,
          timestamp: lastUpdated,
        };
        // Masukkan data baru, urutkan berdasarkan waktu (kiri ke kanan), dan batasi sesuai limit
        const updated = [...prev, newItem].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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
      // Sort history data chronologically ascending (oldest on left, newest on right)
      const sorted = [...data].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setHistory(sorted);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat riwayat sensor."
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
      <div className="h-96 rounded-2xl bg-white border border-black/6 shadow-sm flex items-center justify-center">
        <p className="text-sm text-gray-400">Menyiapkan grafik...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden flex flex-col">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-black/6 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <MdOutlineTimeline size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary leading-tight">
              Tren Grafik Sensor
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Riwayat pengukuran berkala waktu ke waktu
            </p>
          </div>
        </div>

        {/* Header Controls */}
        {!simple && (
          <div className="flex items-center gap-2">
            {/* Mode Toggles */}
            <div className="flex rounded-xl bg-gray-100 p-0.5 border border-black/5 text-xs font-semibold">
              {[
                { id: "both", label: "Semua", Icon: MdCompare },
                { id: "ph", label: "pH", Icon: MdOutlineSpa },
                { id: "moisture", label: "Kelembapan", Icon: MdOutlineWaterDrop },
              ].map((m) => {
                const Icon = m.Icon;
                const isActive = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id as ChartViewMode)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      isActive
                        ? "bg-white text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Limit Selector */}
            <select
              id="chart-limit-select"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
            >
              <option value={10}>10 data</option>
              <option value={20}>20 data</option>
              <option value={30}>30 data</option>
              <option value={50}>50 data</option>
            </select>

            {/* Refresh Button */}
            <button
              id="refresh-chart-btn"
              onClick={loadHistory}
              disabled={isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 hover:bg-gray-50 hover:text-primary disabled:opacity-50 transition shadow-sm cursor-pointer"
              aria-label="Segarkan riwayat sensor"
            >
              <MdRefresh size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div className={`flex-1 p-5 ${simple ? "min-h-[220px]" : "min-h-[320px]"} relative`}>
        {isLoading && history.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 animate-pulse">
            <p className="text-sm font-semibold text-gray-500">Memuat riwayat...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <p className="text-sm font-semibold text-rose-600">⚠ {error}</p>
            <button
              onClick={loadHistory}
              className="mt-3 text-xs font-bold text-primary hover:underline"
            >
              Coba Lagi
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <p className="text-sm font-semibold text-gray-400">
              Belum ada riwayat data tercatat untuk perangkat ini.
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
              Data sensor akan tersimpan ke riwayat secara otomatis setelah perangkat ESP32 Anda mulai mengirimkan data sensor berkala.
            </p>
          </div>
        ) : null}

        {history.length > 0 && (
          <div className={simple ? "w-full h-[180px]" : "w-full h-[300px]"}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="timeLabel"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                
                {/* Y-Axis configuration based on active view mode */}
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
                  wrapperStyle={{ fontSize: 11, fontWeight: 600, color: "#475569" }}
                />

                {/* pH Line */}
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

                {/* Moisture Line */}
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
    </div>
  );
}
