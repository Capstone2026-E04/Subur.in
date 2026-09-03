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

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-black/5">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-100 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-60"></div>
      </div>
      
      <div className="h-20 bg-gray-200 rounded-2xl"></div>
      <div className="h-72 bg-gray-200 rounded-2xl"></div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-2xl"></div>
        ))}
      </div>
    </div>
  );
}

function EmptyDashboardState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-black/12 rounded-3xl bg-white/60 py-20 max-w-xl mx-auto shadow-sm my-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-6">
        <MdOutlineDeviceHub size={40} />
      </div>
      <h3 className="text-lg font-bold text-gray-800">Belum Ada Alat Terhubung</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
        Anda belum mendaftarkan alat sensor apa pun ke akun Anda. Silakan hubungkan alat ESP32 Anda terlebih dahulu untuk mulai memantau kondisi tanaman secara real-time.
      </p>
      <button
        id="dashboard-go-to-devices-btn"
        onClick={() => router.push("/dashboard/devices")}
        className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-all shadow-md shadow-primary/10 cursor-pointer"
      >
        <MdAdd size={18} />
        Hubungkan Alat Baru
      </button>
    </div>
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
    <div className="flex flex-col items-center justify-center text-center p-8 border border-black/6 rounded-3xl bg-white py-16 max-w-xl mx-auto shadow-sm my-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-5">
        <MdOutlineDeviceHub size={32} />
      </div>
      <h3 className="text-lg font-bold text-gray-800">Pilih Alat untuk Memantau</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
        Silakan pilih salah satu perangkat Anda di bawah ini untuk melihat data sensor secara langsung dan panduan perawatan tanaman.
      </p>
      
      <div className="mt-8 w-full max-w-md grid grid-cols-1 gap-3">
        {devices.map((device) => (
          <button
            key={device.id}
            id={`dashboard-select-${device.id}`}
            onClick={() => onSelect(device)}
            className="flex items-center justify-between p-4 rounded-xl border border-black/6 bg-gray-50 hover:bg-primary/5 hover:border-primary transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-black/6 group-hover:bg-primary/10 group-hover:text-primary transition-all text-gray-500">
                <MdOutlineDeviceHub size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700 group-hover:text-primary transition-all">
                  {device.label}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {device.id}
                </p>
              </div>
            </div>
            
            <span className="text-xs font-semibold text-primary group-hover:underline">
              Pilih &rarr;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<DeviceRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  const { ph, moisture, lastUpdated } = useSensorRealtime(selectedDevice?.id || "");

  const loadRecommendation = useCallback(async (silent = false) => {
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
  }, [token, selectedDevice?.id]);

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
    return <UnselectedDeviceState devices={devices} onSelect={(dev) => setSelectedDeviceId(dev.id)} />;
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
      iconBg: selectedDevice.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400",
    },
    {
      label: "Nama Perangkat",
      value: selectedDevice.label,
      icon: MdOutlineDeviceHub,
      iconBg: "bg-orange-500",
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Ringkasan Kondisi</h2>
          <p className="text-xs text-gray-400 mt-1">
            Menampilkan data real-time untuk perangkat:{" "}
            <span className="font-semibold text-gray-700">
              {selectedDevice.label}
            </span>
          </p>
        </div>
        
        <div className="relative">
          <label className="sr-only" htmlFor="dashboard-device-selector">Pilih Alat</label>
          <select
            id="dashboard-device-selector"
            value={selectedDevice.id}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
            }}
            className="appearance-none w-full sm:w-64 rounded-xl border border-black/10 bg-white pl-4 pr-10 py-2.5 text-sm font-semibold text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer shadow-sm"
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

      <div className="rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6 bg-gray-50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-primary">
              Rekomendasi AI (Fuzzy Logic)
            </h3>
          </div>
          <button
            onClick={() => loadRecommendation()}
            disabled={isRecLoading}
            className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            {isRecLoading ? "Memuat..." : "Hitung Ulang"}
          </button>
        </div>

        <div className="p-6">
          {isRecLoading ? (
            <div className="flex flex-col items-center justify-center py-10 animate-pulse">
              <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs text-gray-400 mt-3 font-semibold">Mengalkulasi rekomendasi perawatan terbaik...</p>
            </div>
          ) : !recommendation ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                <MdWarningAmber size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700">Belum Ada Rekomendasi</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Rekomendasi fuzzy belum dapat dihitung karena belum ada telemetri sensor yang masuk dari perangkat ini.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-start gap-8 p-4 rounded-xl bg-gray-50 border border-black/5">
                <div>
                  <span className="text-xs text-gray-400 font-semibold block">pH Terukur</span>
                  <span className="text-base font-bold text-emerald-600">
                    {(ph !== null ? ph : recommendation.phValue).toFixed(1)}
                  </span>
                </div>
                <div className="w-px h-8 bg-black/5" />
                <div>
                  <span className="text-xs text-gray-400 font-semibold block">Kelembapan Terukur</span>
                  <span className="text-base font-bold text-sky-600">
                    {(moisture !== null ? moisture : recommendation.moistureValue).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-500/20 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-600 text-white shadow-sm shadow-emerald-600/10">
                    <MdGrass size={14} />
                    TINDAKAN PERAWATAN YANG DISARANKAN
                  </span>
                </div>
                <p className="text-base sm:text-lg text-emerald-950 font-extrabold leading-relaxed">
                  {recommendation.actionText}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-violet-650 text-white shadow-sm shadow-violet-650/10">
                    <MdScience size={14} />
                    PANDUAN DOSIS PENGAIRAN & NUTRISI
                  </span>
                </div>

                {recommendation.waterVolumeLiter === 0 &&
                recommendation.limeDosageGram === 0 &&
                recommendation.sulfurDosageGram === 0 &&
                !recommendation.reduceWatering ? (
                  <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200/80 p-4">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                      <MdCheckCircleOutline size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-emerald-900">Kondisi Sangat Baik</p>
                      <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                        Tingkat keasaman (pH) dan kelembapan tanah Anda saat ini sangat ideal untuk pertumbuhan optimal tanaman **{plantName}**. Teruskan pola penyiraman harian normal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendation.waterVolumeLiter > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-50 border border-sky-200/85 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-sky-100 text-sky-600 shrink-0">
                            <MdOpacity size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-sky-900">Saran Penyiraman</p>
                            <p className="text-xs text-sky-700 leading-relaxed">
                              Siram media tanam untuk mengembalikan kelembapan.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white border border-sky-200 rounded-lg px-3.5 py-2 shrink-0 shadow-sm min-w-[85px]">
                          <span className="text-2xl font-extrabold text-sky-650 leading-none">
                            {recommendation.waterVolumeLiter.toFixed(1)}
                          </span>
                          <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider mt-1.5">
                            Liter Air
                          </span>
                        </div>
                      </div>
                    )}

                    {recommendation.reduceWatering && (
                      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200/85 p-4 shadow-sm">
                        <div className="p-2 rounded-lg bg-amber-100 text-amber-600 shrink-0">
                          <MdWarningAmber size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-amber-900">Kurangi / Hentikan Penyiraman</p>
                          <p className="text-xs text-amber-700 leading-relaxed">
                            Tanah terlalu basah. Hentikan penyiraman sementara waktu untuk menghindari pembusukan akar tanaman.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.limeDosageGram > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-200/85 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                            <MdScience size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-emerald-900">Saran Pengapuran (Naikkan pH)</p>
                            <p className="text-xs text-emerald-700 leading-relaxed">
                              Taburkan Kapur (Dolomit) rata untuk menetralkan tanah asam.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white border border-emerald-200 rounded-lg px-3.5 py-2 shrink-0 shadow-sm min-w-[85px]">
                          <span className="text-2xl font-extrabold text-emerald-650 leading-none">
                            {recommendation.limeDosageGram.toFixed(0)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-1.5">
                            Gram Kapur
                          </span>
                        </div>
                      </div>
                    )}

                    {recommendation.sulfurDosageGram > 0 && (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-violet-50 border border-violet-200/85 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-violet-100 text-violet-600 shrink-0">
                            <MdScience size={20} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-extrabold text-violet-900">Saran Pemberian Belerang</p>
                            <p className="text-xs text-violet-700 leading-relaxed">
                              Taburkan bubuk belerang rata untuk menyeimbangkan tanah basa.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-white border border-violet-200 rounded-lg px-3.5 py-2 shrink-0 shadow-sm min-w-[85px]">
                          <span className="text-2xl font-extrabold text-violet-650 leading-none">
                            {recommendation.sulfurDosageGram.toFixed(0)}
                          </span>
                          <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mt-1.5">
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
        </div>
      </div>

      <SensorMonitorPanel deviceId={selectedDevice.id} deviceLabel={selectedDevice.label} />

      <SensorHistoryChart deviceId={selectedDevice.id} token={token} simple={true} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </div>
  );
}
