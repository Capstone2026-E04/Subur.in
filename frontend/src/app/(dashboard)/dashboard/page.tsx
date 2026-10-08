"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MdOutlineSpa,
  MdWaterDrop,
  MdThermostat,
  MdOutlineDeviceHub,
  MdAdd,
  MdOutlineArrowDropDown,
  MdAutoAwesome,
  MdOpacity,
  MdScience,
  MdGrass,
  MdCheckCircleOutline,
  MdWarningAmber,
} from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import { useSensorRealtime } from "@/hooks/useSensorRealtime";
import { fetchDeviceRecommendation } from "@/services/deviceService";
import StatCard from "@/components/dashboard/StatCard";
import SensorMonitorPanel from "@/components/dashboard/SensorMonitorPanel";
import SensorHistoryChart from "@/components/dashboard/SensorHistoryChart";
import type { RegisteredDevice, DeviceRecommendation } from "@/types/device";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

function DashboardSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-black/5 pb-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-200"></div>
          <div className="h-4 w-64 rounded bg-gray-100"></div>
        </div>
        <div className="h-10 w-60 rounded bg-gray-200"></div>
      </div>

      <div className="h-20 rounded-2xl bg-gray-200"></div>
      <div className="h-72 rounded-2xl bg-gray-200"></div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-200"></div>
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
      <h3 className="text-lg font-bold text-gray-800">
        Belum Ada Alat Terhubung
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
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
      <h3 className="text-lg font-bold text-gray-800">
        Pilih Alat untuk Memantau
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
        Silakan pilih salah satu perangkat Anda di bawah ini untuk melihat data
        sensor secara langsung dan panduan perawatan tanaman.
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-3">
        {devices.map((device) => (
          <button
            key={device.id}
            id={`dashboard-select-${device.id}`}
            onClick={() => onSelect(device)}
            className="hover:bg-primary/5 hover:border-primary group flex cursor-pointer items-center justify-between rounded-xl border border-black/6 bg-gray-50 p-4 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="group-hover:bg-primary/10 group-hover:text-primary flex h-9 w-9 items-center justify-center rounded-lg border border-black/6 bg-white text-gray-500 transition-all">
                <MdOutlineDeviceHub size={18} />
              </div>
              <div>
                <p className="group-hover:text-primary text-sm font-bold text-gray-700 transition-all">
                  {device.label}
                </p>
                <p className="mt-0.5 font-mono text-xs text-gray-400">
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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [recommendation, setRecommendation] =
    useState<DeviceRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const selectedDevice =
    devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  const { ph, moisture, lastUpdated } = useSensorRealtime(
    selectedDevice?.id || "",
    token,
  );

  const loadRecommendation = useCallback(
    async (silent = false) => {
      if (!token || !selectedDevice?.id) return;
      if (!silent) setIsRecLoading(true);
      try {
        const data = await fetchDeviceRecommendation(token, selectedDevice.id);
        setRecommendation(data);
      } catch {
        setRecommendation(null);
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

  const plantName = selectedDevice.plant?.name ?? "Tanaman";
  const polybag = selectedDevice.polybag;
  let polybagInfo = "Belum diatur";
  if (polybag) {
    const name = polybag.polybagType?.name || polybag.name;
    const volume = polybag.soilVolumeLiter;
    const diameter = polybag.polybagType?.diameter;
    const height = polybag.polybagType?.height;

    const nameStr = name && name !== "undefined" ? name : "";

    let sizeStr = "";
    if (volume) {
      sizeStr = `${volume}L`;
    } else if (diameter && height) {
      sizeStr = `${diameter}x${height} cm`;
    } else if (polybag.size && polybag.size !== "undefined") {
      sizeStr = polybag.size;
    }

    if (nameStr && sizeStr) {
      polybagInfo = `${nameStr} (${sizeStr})`;
    } else if (nameStr) {
      polybagInfo = nameStr;
    } else if (sizeStr) {
      polybagInfo = sizeStr;
    }
  }

  const stats = [
    {
      label: "Tanaman Dipantau",
      value: plantName,
      icon: MdOutlineSpa,
      iconBg: "bg-primary",
    },
    {
      label: "Ukuran Polybag",
      value: polybagInfo,
      icon: MdWaterDrop,
      iconBg: "bg-sky-500",
    },
    {
      label: "Status Alat",
      value: selectedDevice.status === "ACTIVE" ? "Aktif" : "Tidak Aktif",
      icon: MdThermostat,
      iconBg:
        selectedDevice.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400",
    },
    {
      label: "Nama Perangkat",
      value: selectedDevice.label,
      icon: MdOutlineDeviceHub,
      iconBg: "bg-orange-500",
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-black/5 pb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-lg font-bold">Ringkasan Kondisi</h2>
          <p className="mt-1 text-xs text-gray-400">
            Menampilkan data real-time untuk perangkat:{" "}
            <span className="font-semibold text-gray-700">
              {selectedDevice.label}
            </span>
          </p>
        </div>

        <div className="relative">
          <label className="sr-only" htmlFor="dashboard-device-selector">
            Pilih Alat
          </label>
          <select
            id="dashboard-device-selector"
            value={selectedDevice.id}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
            }}
            className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer appearance-none rounded-xl border border-black/10 bg-white py-2.5 pr-10 pl-4 text-sm font-semibold text-gray-700 shadow-sm transition focus:ring-2 focus:outline-none sm:w-64"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
            <MdOutlineArrowDropDown size={20} />
          </div>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/60 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-primary text-sm font-bold">
              Rekomendasi Perawatan AI
            </h3>
          </div>
          <button
            onClick={() => loadRecommendation()}
            disabled={isRecLoading}
            className="text-primary flex cursor-pointer items-center gap-1 text-xs font-bold hover:underline"
          >
            {isRecLoading ? "Memuat..." : "Hitung Ulang"}
          </button>
        </CardHeader>

        <CardContent className="p-6">
          {isRecLoading ? (
            <div className="flex animate-pulse flex-col items-center justify-center py-10">
              <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
              <p className="mt-3 text-xs font-semibold text-gray-400">
                Mengalkulasi rekomendasi perawatan terbaik...
              </p>
            </div>
          ) : !recommendation ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
                <MdWarningAmber size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                Belum Ada Rekomendasi
              </p>
              <p className="mt-1 max-w-sm text-xs text-gray-400">
                Rekomendasi fuzzy belum dapat dihitung karena belum ada
                telemetri sensor yang masuk dari perangkat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-start gap-8 rounded-xl border border-black/5 bg-gray-50 p-4">
                <div>
                  <span className="block text-xs font-semibold text-gray-400">
                    pH Terukur
                  </span>
                  <span className="text-base font-bold text-emerald-600">
                    {(ph !== null ? ph : recommendation.phValue).toFixed(1)}
                  </span>
                </div>
                <div className="h-8 w-px bg-black/5" />
                <div>
                  <span className="block text-xs font-semibold text-gray-400">
                    Kelembapan Terukur
                  </span>
                  <span className="text-base font-bold text-sky-600">
                    {(moisture !== null
                      ? moisture
                      : recommendation.moistureValue
                    ).toFixed(0)}
                    %
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-teal-50/30 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/10">
                    <MdGrass size={14} />
                    TINDAKAN PERAWATAN YANG DISARANKAN
                  </span>
                </div>
                <p className="text-base leading-relaxed font-extrabold text-emerald-950 sm:text-lg">
                  {recommendation.actionText}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-violet-650 shadow-violet-650/10 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-extrabold text-white shadow-sm">
                    <MdScience size={14} />
                    PANDUAN DOSIS PENGAIRAN & NUTRISI
                  </span>
                </div>

                {recommendation.waterVolumeLiter === 0 &&
                recommendation.limeDosageGram === 0 &&
                recommendation.sulfurDosageGram === 0 &&
                !recommendation.reduceWatering ? (
                  <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50 p-4">
                    <div className="shrink-0 rounded-lg bg-emerald-100 p-2 text-emerald-600">
                      <MdCheckCircleOutline size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-emerald-900">
                        Kondisi Sangat Baik
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                        Tingkat keasaman (pH) dan kelembapan tanah Anda saat ini
                        sangat ideal untuk pertumbuhan optimal tanaman{" "}
                        <strong>{plantName}</strong>. Teruskan pola penyiraman
                        harian normal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {recommendation.waterVolumeLiter > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-200/85 bg-sky-50 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 rounded-lg bg-sky-100 p-2 text-sky-600">
                            <MdOpacity size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-sky-900">
                              Saran Penyiraman
                            </p>
                            <p className="text-xs leading-relaxed text-sky-700">
                              Siram media tanam untuk mengembalikan kelembapan.
                            </p>
                          </div>
                        </div>
                        <div className="flex min-w-[85px] shrink-0 flex-col items-center justify-center rounded-lg border border-sky-200 bg-white px-3.5 py-2 shadow-sm">
                          <span className="text-sky-650 text-2xl leading-none font-extrabold">
                            {recommendation.waterVolumeLiter.toFixed(1)}
                          </span>
                          <span className="mt-1.5 text-[10px] font-bold tracking-wider text-sky-500 uppercase">
                            Liter Air
                          </span>
                        </div>
                      </div>
                    )}

                    {recommendation.reduceWatering && (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-200/85 bg-amber-50 p-4 shadow-sm">
                        <div className="shrink-0 rounded-lg bg-amber-100 p-2 text-amber-600">
                          <MdWarningAmber size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-amber-900">
                            Kurangi / Hentikan Penyiraman
                          </p>
                          <p className="text-xs leading-relaxed text-amber-700">
                            Tanah terlalu basah. Hentikan penyiraman sementara
                            waktu untuk menghindari pembusukan akar tanaman.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.limeDosageGram > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200/85 bg-emerald-50 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 rounded-lg bg-emerald-100 p-2 text-emerald-600">
                            <MdScience size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-emerald-900">
                              Saran Pengapuran (Naikkan pH)
                            </p>
                            <p className="text-xs leading-relaxed text-emerald-700">
                              Taburkan Kapur (Dolomit) rata untuk menetralkan
                              tanah asam.
                            </p>
                          </div>
                        </div>
                        <div className="flex min-w-[85px] shrink-0 flex-col items-center justify-center rounded-lg border border-emerald-200 bg-white px-3.5 py-2 shadow-sm">
                          <span className="text-emerald-650 text-2xl leading-none font-extrabold">
                            {recommendation.limeDosageGram.toFixed(0)}
                          </span>
                          <span className="mt-1.5 text-[10px] font-bold tracking-wider text-emerald-500 uppercase">
                            Gram Kapur
                          </span>
                        </div>
                      </div>
                    )}

                    {recommendation.sulfurDosageGram > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-violet-200/85 bg-violet-50 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 rounded-lg bg-violet-100 p-2 text-violet-600">
                            <MdScience size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-violet-900">
                              Saran Pemberian Belerang
                            </p>
                            <p className="text-xs leading-relaxed text-violet-700">
                              Taburkan bubuk belerang rata untuk menyeimbangkan
                              tanah basa.
                            </p>
                          </div>
                        </div>
                        <div className="flex min-w-[85px] shrink-0 flex-col items-center justify-center rounded-lg border border-violet-200 bg-white px-3.5 py-2 shadow-sm">
                          <span className="text-violet-650 text-2xl leading-none font-extrabold">
                            {recommendation.sulfurDosageGram.toFixed(0)}
                          </span>
                          <span className="mt-1.5 text-[10px] font-bold tracking-wider text-violet-500 uppercase">
                            Gram Belerang
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <SensorMonitorPanel
        deviceId={selectedDevice.id}
        deviceLabel={selectedDevice.label}
        token={token}
      />

      <SensorHistoryChart
        deviceId={selectedDevice.id}
        token={token}
        simple={true}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}
