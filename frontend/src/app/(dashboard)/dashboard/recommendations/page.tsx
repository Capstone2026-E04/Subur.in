"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDevices } from "@/hooks/useDevices";
import { useSelectedDeviceStore } from "@/stores/selectedDeviceStore";
import { fetchDeviceRecommendationResult } from "@/services/deviceService";
import type { DeviceRecommendation } from "@/types/device";
import TreatmentCards from "@/components/recommendations/TreatmentCards";

export default function RecommendationsPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const { selectedDeviceId } = useSelectedDeviceStore();
  const device = devices.find((d) => d.id === selectedDeviceId) ?? devices[0];
  const [recommendation, setRecommendation] =
    useState<DeviceRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const invalidate = useCallback(() => {
    version.current++;
  }, []);
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);
  const refresh = useCallback(async () => {
    const request = ++version.current;
    setRecommendation(null);
    setError(null);
    setMessage("");
    if (!token || !device) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchDeviceRecommendationResult(token, device.id);
      if (request !== version.current) return;
      setRecommendation(result.data);
      setMessage(result.message);
    } catch (err) {
      if (request === version.current)
        setError(
          err instanceof Error ? err.message : "Gagal memuat rekomendasi.",
        );
    } finally {
      if (request === version.current) setLoading(false);
    }
  }, [token, device]);
  useEffect(() => {
    refresh();
    return invalidate;
  }, [refresh, invalidate]);
  return (
    <div className="mx-auto w-full max-w-6xl pb-6">
      <TreatmentCards
        recommendation={recommendation}
        loading={isLoading || loading}
        message={
          device
            ? message
            : "Hubungkan perangkat terlebih dahulu untuk melihat rekomendasi perawatan."
        }
        error={error}
        deviceName={device?.label ?? "Belum ada perangkat"}
        onRefresh={refresh}
      />
    </div>
  );
}
