"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MdOutlineDeviceHub, MdAdd } from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import { usePlants } from "@/hooks/usePlants";
import { useSensorRealtime } from "@/hooks/useSensorRealtime";
import { fetchDeviceRecommendationResult } from "@/services/deviceService";
import { useSelectedDeviceStore } from "@/stores/selectedDeviceStore";
import RecommendationSummaryCard from "@/components/dashboard/RecommendationSummaryCard";
import PhLevelCard from "@/components/dashboard/PhLevelCard";
import MoistureLevelCard from "@/components/dashboard/MoistureLevelCard";
import SensorTrendCard from "@/components/dashboard/SensorTrendCard";
import { DEFAULT_PH_RANGE } from "@/components/dashboard/sensorStatus";
import type { RegisteredDevice, DeviceRecommendation } from "@/types/device";
import { Card } from "@/components/ui/card";

function DashboardSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2.1fr_1fr_1fr]">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-60 rounded-3xl bg-neutral-200"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-72 rounded-3xl bg-neutral-200"></div>
        ))}
      </div>
    </div>
  );
}

function EmptyDashboardState() {
  const router = useRouter();
  return (
    <Card className="mx-auto my-8 max-w-xl items-center justify-center rounded-3xl border-dashed p-8 py-20 text-center">
      <div className="bg-primary/8 text-primary mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <MdOutlineDeviceHub size={40} />
      </div>
      <h3 className="text-lg font-bold text-neutral-800">
        Belum Ada Alat Terhubung
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
        Anda belum mendaftarkan alat sensor apa pun ke akun Anda. Silakan
        hubungkan alat ESP32 Anda terlebih dahulu untuk mulai memantau kondisi
        tanaman secara real-time.
      </p>
      <button
        id="dashboard-go-to-devices-btn"
        onClick={() => router.push("/dashboard/devices")}
        className="bg-primary hover:bg-primary-light shadow-primary/10 mt-8 flex cursor-pointer items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-md transition-all"
      >
        <MdAdd size={18} />
        Hubungkan Alat Baru
      </button>
    </Card>
  );
}

function UnselectedDeviceState({
  devices,
  onSelect,
}: {
  devices: RegisteredDevice[];
  onSelect: (device: RegisteredDevice) => void;
}) {
  return (
    <Card className="mx-auto my-8 max-w-xl items-center justify-center rounded-3xl p-8 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
        <MdOutlineDeviceHub size={32} />
      </div>
      <h3 className="text-lg font-bold text-neutral-800">
        Pilih Alat untuk Memantau
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
        Silakan pilih salah satu perangkat Anda di bawah ini untuk melihat data
        sensor secara langsung dan panduan perawatan tanaman.
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-3">
        {devices.map((device) => (
          <button
            key={device.id}
            id={`dashboard-select-${device.id}`}
            onClick={() => onSelect(device)}
            className="hover:bg-primary/5 hover:border-primary group flex cursor-pointer items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="group-hover:bg-primary/10 group-hover:text-primary flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-all">
                <MdOutlineDeviceHub size={18} />
              </div>
              <div>
                <p className="group-hover:text-primary text-sm font-bold text-neutral-700 transition-all">
                  {device.label}
                </p>
                <p className="mt-0.5 font-mono text-xs text-neutral-400">
                  {device.deviceCode}
                </p>
              </div>
            </div>

            <span className="text-primary text-xs font-semibold group-hover:underline">
              Pilih &rarr;
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const { plants, loadPlants } = usePlants();
  const { selectedDeviceId, setSelectedDeviceId } = useSelectedDeviceStore();
  const [recommendation, setRecommendation] =
    useState<DeviceRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  const selectedDevice =
    devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  const devicePlant = plants.find((p) => p.id === selectedDevice?.plant?.id);

  const { ph, moisture, moistureType, lastUpdated } = useSensorRealtime(
    selectedDevice?.id || "",
    token,
  );

  const loadRecommendation = useCallback(
    async (silent = false) => {
      if (!token || !selectedDevice?.id) return;
      if (!silent) setIsRecLoading(true);
      try {
        const result = await fetchDeviceRecommendationResult(
          token,
          selectedDevice.id,
        );
        setRecommendation(result.data);
        setRecommendationMessage(result.message);
        setRecommendationError(null);
      } catch (error) {
        setRecommendation(null);
        setRecommendationMessage("");
        setRecommendationError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat rekomendasi.",
        );
      } finally {
        if (!silent) setIsRecLoading(false);
      }
    },
    [token, selectedDevice?.id],
  );

  useEffect(() => {
    loadRecommendation(false);
  }, [selectedDevice?.id, loadRecommendation]);
  useEffect(() => {
    if (lastUpdated) {
      loadRecommendation(true);
    }
  }, [lastUpdated, loadRecommendation]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (devices.length === 0) {
    return <EmptyDashboardState />;
  }

  if (!selectedDevice) {
    return (
      <UnselectedDeviceState
        devices={devices}
        onSelect={(dev) => setSelectedDeviceId(dev.id)}
      />
    );
  }

  const currentPh = ph ?? recommendation?.phValue ?? null;
  const currentMoisture = moisture ?? recommendation?.moistureValue ?? null;
  const phRange = devicePlant
    ? { min: devicePlant.minPh, max: devicePlant.maxPh }
    : DEFAULT_PH_RANGE;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-5">
      <div>
        <RecommendationSummaryCard
          recommendation={recommendation}
          isLoading={isRecLoading}
          message={recommendationMessage}
          error={recommendationError}
          updatedAt={lastUpdated ?? recommendation?.timestamp ?? null}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <MoistureLevelCard
          value={currentMoisture}
          moistureType={moistureType}
          nmiTrigger={devicePlant?.nmiTrigger ?? null}
        />
        <PhLevelCard value={currentPh} range={phRange} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <SensorTrendCard
          title="Tren Kelembapan Tanah"
          metric="moisture"
          deviceId={selectedDevice.id}
          token={token}
          color="#237844"
        />
        <SensorTrendCard
          title="Tingkat pH Tanah"
          metric="ph"
          deviceId={selectedDevice.id}
          token={token}
          color="#2f6f3a"
        />
      </div>
    </div>
  );
}
