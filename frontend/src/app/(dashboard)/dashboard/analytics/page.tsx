"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MdCalendarToday,
  MdWaterDrop,
  MdThermostat,
  MdTrendingUp,
  MdTrendingDown,
  MdOutlineSpa,
  MdOutlineDeviceHub,
  MdRefresh,
  MdOutlineTimeline,
  MdWarningAmber,
  MdOutlineArrowDropDown,
} from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import { fetchSensorHistory } from "@/services/deviceService";
import type { SensorHistoryItem } from "@/types/device";
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

type ChartViewMode = "both" | "ph" | "moisture";

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-black/5">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded w-64 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-60 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="h-32 bg-gray-200 rounded-3xl animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded-3xl animate-pulse"></div>
      </div>
      <div className="h-96 bg-gray-200 rounded-3xl animate-pulse"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-black/12 rounded-3xl bg-white/60 py-20 max-w-xl mx-auto shadow-sm my-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-6 animate-bounce">
        <MdOutlineTimeline size={40} />
      </div>
      <h3 className="text-lg font-bold text-gray-800">Belum Ada Alat Terdaftar</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
        Silakan hubungkan perangkat Anda terlebih dahulu pada tab "Perangkat" untuk melihat analitik dan visualisasi data sensor real-time.
      </p>
    </div>
  );
}

function formatChartTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-black/8 bg-white/95 p-3.5 shadow-xl backdrop-blur-sm">
        <p className="text-xs font-bold text-gray-400 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.stroke || p.color }}
              />
              <span className="text-xs text-gray-600 font-semibold">{p.name}:</span>
              <span className="text-xs font-bold text-gray-800">
                {p.value.toFixed(p.name === "pH" ? 2 : 1)}
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

export default function AnalyticsPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [history, setHistory] = useState<SensorHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [limit, setLimit] = useState(50);
  const [viewMode, setViewMode] = useState<ChartViewMode>("both");
  const [aggregation, setAggregation] = useState<"raw" | "30s" | "1m" | "5m" | "15m" | "30m" | "1h">("raw");
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
    setIsMounted(true);
  }, [loadDevices]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  const loadHistory = useCallback(async () => {
    if (!token || !selectedDevice?.id) return;
    setIsHistoryLoading(true);
    setError(null);
    try {
      const data = await fetchSensorHistory(token, selectedDevice.id, limit);
      const sorted = [...data].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setHistory(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat sensor.");
      setHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, selectedDevice?.id, limit]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const aggregateHistory = useCallback((data: SensorHistoryItem[]) => {
    if (aggregation === "raw" || data.length === 0) return data;

    const msMap: Record<string, number> = {
      "30s": 30 * 1000,
      "1m": 1 * 60 * 1000,
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
    };
    const ms = msMap[aggregation] || 60 * 1000;
    const grouped: Record<string, { sumPh: number; sumMoisture: number; count: number; timestamp: string }> = {};

    data.forEach((item) => {
      if (!item.timestamp) return;
      const time = new Date(item.timestamp).getTime();
      if (isNaN(time)) return;
      
      const roundedTime = Math.round(time / ms) * ms;
      if (isNaN(roundedTime)) return;
      const key = new Date(roundedTime).toISOString();

      if (!grouped[key]) {
        grouped[key] = { sumPh: 0, sumMoisture: 0, count: 0, timestamp: key };
      }
      grouped[key].sumPh += item.ph;
      grouped[key].sumMoisture += item.moisture;
      grouped[key].count += 1;
    });

    return Object.values(grouped)
      .map((g, index) => ({
        id: index,
        deviceId: data[0].deviceId,
        timestamp: g.timestamp,
        ph: g.sumPh / g.count,
        moisture: g.sumMoisture / g.count,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [aggregation]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (devices.length === 0) {
    return <EmptyState />;
  }

  if (!selectedDevice) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500 font-semibold">Memuat perangkat...</p>
      </div>
    );
  }

  const plantName = selectedDevice.plant?.name ?? "Tanaman";

  const displayData = aggregateHistory(history);

  const validPhValues = displayData.map((h) => h.ph).filter((val) => typeof val === "number" && !isNaN(val));
  const validMoistureValues = displayData.map((h) => h.moisture).filter((val) => typeof val === "number" && !isNaN(val));

  const avgPh = validPhValues.length ? validPhValues.reduce((a, b) => a + b, 0) / validPhValues.length : 0;
  const minPh = validPhValues.length ? Math.min(...validPhValues) : 0;
  const maxPh = validPhValues.length ? Math.max(...validPhValues) : 0;

  const avgMoisture = validMoistureValues.length ? validMoistureValues.reduce((a, b) => a + b, 0) / validMoistureValues.length : 0;
  const minMoisture = validMoistureValues.length ? Math.min(...validMoistureValues) : 0;
  const maxMoisture = validMoistureValues.length ? Math.max(...validMoistureValues) : 0;

  const intervalMinutes = selectedDevice.sensorInterval ?? 15;
  const totalMinutes = displayData.length * intervalMinutes;
  let durationText = "";
  if (totalMinutes < 60) {
    durationText = `${totalMinutes} menit terakhir`;
  } else {
    const hours = (totalMinutes / 60).toFixed(1);
    durationText = `${hours} jam terakhir`;
  }

  const formattedData = displayData.map((item) => ({
    ...item,
    timeLabel: formatChartTime(item.timestamp),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary leading-tight">
            Analitik Kebun
          </h2>
        </div>

        <div className="relative shrink-0">
          <label className="sr-only" htmlFor="analytics-device-selector">Pilih Alat</label>
          <select
            id="analytics-device-selector"
            value={selectedDevice.id}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="appearance-none w-full sm:w-64 rounded-xl border border-black/10 bg-white pl-4 pr-10 py-2.5 text-sm font-bold text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer shadow-sm"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label} ({device.plant?.name ?? "Tanaman"})
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
            <MdOutlineArrowDropDown size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-black/5 p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Rata-rata Kelembapan
            </p>
            <p className="text-[10px] text-gray-400 font-medium leading-none">
              Dihitung dari data {durationText}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">
                {avgMoisture > 0 ? `${avgMoisture.toFixed(1)}%` : "--"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
              <span>Min: <strong className="text-gray-600">{minMoisture > 0 ? `${minMoisture.toFixed(0)}%` : "--"}</strong></span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>Max: <strong className="text-gray-600">{maxMoisture > 0 ? `${maxMoisture.toFixed(0)}%` : "--"}</strong></span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center shrink-0 shadow-inner">
            <MdWaterDrop size={24} />
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/5 p-5 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Rata-rata pH Tanah
            </p>
            <p className="text-[10px] text-gray-400 font-medium leading-none">
              Dihitung dari data {durationText}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-800">
                {avgPh > 0 ? avgPh.toFixed(2) : "--"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
              <span>Min: <strong className="text-gray-600">{minPh > 0 ? minPh.toFixed(1) : "--"}</strong></span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span>Max: <strong className="text-gray-600">{maxPh > 0 ? maxPh.toFixed(1) : "--"}</strong></span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-inner">
            <MdOutlineSpa size={24} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-black/6 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <MdOutlineTimeline size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary leading-tight">
                Tren Parameter Lingkungan
              </h3>
              <p className="text-xs text-gray-400 font-medium">
                Riwayat telemetri pH dan Kelembapan secara real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex rounded-xl bg-gray-100 p-0.5 border border-black/5 text-xs font-bold">
              {[
                { id: "both", label: "Semua" },
                { id: "ph", label: "pH" },
                { id: "moisture", label: "Lembap" },
              ].map((m) => {
                const isActive = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id as ChartViewMode)}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      isActive
                        ? "bg-white text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            <select
              id="analytics-limit-select"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
            >
              <option value={10}>10 data</option>
              <option value={30}>30 data</option>
              <option value={50}>50 data</option>
              <option value={100}>100 data</option>
              <option value={200}>200 data</option>
              <option value={500}>500 data</option>
            </select>

            <select
              id="analytics-aggregation-select"
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
            >
              <option value="raw">Mentah (Semua)</option>
              <option value="30s">Tiap 30 Detik</option>
              <option value="1m">Tiap 1 Menit</option>
              <option value="5m">Tiap 5 Menit</option>
              <option value="15m">Tiap 15 Menit</option>
              <option value="30m">Tiap 30 Menit</option>
              <option value="1h">Tiap 1 Jam</option>
            </select>

            {/* Refresh Button */}
            <button
              id="refresh-analytics-btn"
              onClick={loadHistory}
              disabled={isHistoryLoading}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 hover:bg-gray-50 hover:text-primary disabled:opacity-50 transition shadow-sm cursor-pointer"
              aria-label="Segarkan riwayat sensor"
            >
              <MdRefresh size={16} className={isHistoryLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Chart Canvas Area */}
        <div className="flex-1 p-5 min-h-[360px] relative">
          {isHistoryLoading && history.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 z-10 animate-pulse">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <p className="text-xs font-semibold text-gray-400">Memuat analisis data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                <MdWarningAmber size={24} />
              </div>
              <p className="text-sm font-bold text-rose-600">⚠ {error}</p>
              <button
                onClick={loadHistory}
                className="mt-3 text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Coba Segarkan Kembali
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="h-12 w-12 rounded-xl bg-gray-50 border border-black/5 text-gray-400 flex items-center justify-center mb-3">
                <MdOutlineTimeline size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700">Belum Ada Riwayat Data</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                Nyalakan perangkat **{selectedDevice.label}** Anda untuk merekam log pembacaan sensor ke database.
              </p>
            </div>
          ) : null}

          {isMounted && history.length > 0 && (
            <div className="w-full h-[320px]">
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

                  {/* pH Axis */}
                  {(viewMode === "ph" || viewMode === "both") && (
                    <YAxis
                      yAxisId="ph-axis"
                      domain={[0, 14]}
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                  )}

                  {/* Moisture Axis */}
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
                    wrapperStyle={{ fontSize: 11, fontWeight: 700, color: "#475569" }}
                  />

                  {/* pH Line */}
                  {(viewMode === "ph" || viewMode === "both") && (
                    <Line
                      yAxisId="ph-axis"
                      type="monotone"
                      dataKey="ph"
                      name="pH"
                      stroke="#059669"
                      strokeWidth={3}
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
                      strokeWidth={3}
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
    </div>
  );
}
