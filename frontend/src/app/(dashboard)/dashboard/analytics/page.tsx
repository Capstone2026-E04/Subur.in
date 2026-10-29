"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useDevices } from "@/hooks/useDevices";
import { useSelectedDeviceStore } from "@/stores/selectedDeviceStore";
import { fetchRecommendationHistory } from "@/services/deviceService";
import type { RecommendationLogItem } from "@/types/device";
import { categoryLabel } from "@/components/recommendations/categoryLabel";
import SensorTrendCard from "@/components/dashboard/SensorTrendCard";
import { Card } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { devices, token, isLoading, loadDevices } = useDevices();
  const { selectedDeviceId } = useSelectedDeviceStore();
  const device =
    devices.find((item) => item.id === selectedDeviceId) ?? devices[0];
  const [logs, setLogs] = useState<RecommendationLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);
  const loadVersion = useRef(0);
  const invalidateLoad = useCallback(() => {
    loadVersion.current++;
  }, []);
  const loadLogs = useCallback(async () => {
    const version = ++loadVersion.current;
    if (!token || !device?.id) return;
    setLoading(true);
    setError(null);
    setLogs([]);
    try {
      const result = await fetchRecommendationHistory(token, device.id);
      if (version === loadVersion.current) setLogs(result);
    } catch (err) {
      if (version !== loadVersion.current) return;
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memuat riwayat rekomendasi.",
      );
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [token, device?.id]);
  useEffect(() => {
    loadLogs();
    return invalidateLoad;
  }, [loadLogs, invalidateLoad]);

  if (isLoading)
    return (
      <div
        className="h-64 animate-pulse rounded-3xl bg-neutral-100"
        aria-label="Memuat riwayat"
      />
    );
  if (!device)
    return (
      <Card className="p-6 text-center">
        Hubungkan perangkat terlebih dahulu untuk melihat riwayat tanaman.
      </Card>
    );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
      <SensorTrendCard
        title="Grafik Nilai Kelembapan"
        metric="moisture"
        deviceId={device.id}
        token={token}
        color="#237844"
      />
      <SensorTrendCard
        title="Grafik Nilai pH"
        metric="ph"
        deviceId={device.id}
        token={token}
        color="#2f6f3a"
      />
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold">Riwayat Rekomendasi</h1>
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="text-primary min-h-11 cursor-pointer text-sm font-semibold disabled:opacity-50"
          >
            Muat ulang
          </button>
        </div>
        <p className="mb-4 text-sm text-neutral-500">
          Catatan perawatan untuk {device.label}.
        </p>
        {loading ? (
          <p role="status" className="py-6 text-sm text-neutral-500">
            Memuat riwayat...
          </p>
        ) : error ? (
          <p role="alert" className="py-6 text-sm text-red-600">
            {error}
          </p>
        ) : logs.length === 0 ? (
          <p className="py-6 text-sm text-neutral-500">
            Belum ada riwayat rekomendasi untuk perangkat ini.
          </p>
        ) : (
          <ol className="divide-y divide-neutral-200">
            {logs.map((log) => (
              <li key={log.id} className="space-y-2 py-4">
                <time
                  dateTime={log.createdAt}
                  className="text-xs text-neutral-500"
                >
                  {new Date(log.createdAt).toLocaleString("id-ID")}
                </time>
                <p className="text-primary text-xs font-semibold">
                  {categoryLabel(log.categoryCode)}
                </p>
                <p className="text-sm font-medium break-words">
                  {log.actionText}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                  <span>pH: {log.phValue}</span>
                  <span>Kelembapan: {log.moistureValue}% VWC</span>
                  <span>Air: {log.waterVolumeLiter} L</span>
                  {log.limeDosageGram > 0 && (
                    <span>Dolomit: {log.limeDosageGram} g</span>
                  )}
                  {log.sulfurDosageGram > 0 && (
                    <span>Sulfur: {log.sulfurDosageGram} g</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  Catatan:{" "}
                  {log.reduceWatering
                    ? "Hentikan penyiraman sementara."
                    : "Ikuti takaran dan pantau kondisi media sebelum perawatan berikutnya."}
                </p>
                <p className="text-xs text-neutral-400">
                  {log.isDev ? "Data pengujian Developer Mode. " : ""}Status
                  pelaksanaan perawatan belum dicatat.
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
