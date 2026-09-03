"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MdOutlineSpa,
  MdWaterDrop,
  MdThermostat,
  MdOutlineDeviceHub,
  MdAutoAwesome,
  MdOpacity,
  MdScience,
  MdGrass,
  MdCheckCircleOutline,
  MdWarningAmber,
  MdOutlineArrowDropDown,
  MdHistory,
  MdChevronRight,
  MdSchedule,
} from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import {
  fetchDeviceRecommendation,
  fetchRecommendationHistory,
} from "@/services/deviceService";
import type { RegisteredDevice, DeviceRecommendation, RecommendationLogItem } from "@/types/device";

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-black/5">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-100 rounded w-64"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-60"></div>
      </div>
      <div className="h-64 bg-gray-200 rounded-3xl"></div>
      <div className="h-80 bg-gray-200 rounded-3xl"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-black/12 rounded-3xl bg-white/60 py-20 max-w-xl mx-auto shadow-sm my-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-6">
        <MdAutoAwesome size={40} className="animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-gray-800">Belum Ada Alat Terdaftar</h3>
      <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
        Silakan hubungkan perangkat Anda terlebih dahulu pada tab "Perangkat" untuk melihat kalkulasi rekomendasi agronomis otomatis dari AI.
      </p>
    </div>
  );
}

export default function RecommendationsPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  const [recommendation, setRecommendation] = useState<DeviceRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  const [historyLogs, setHistoryLogs] = useState<RecommendationLogItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Pagination & limit states
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState<number | "all">(20);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  // Pagination slicing logic
  const logsToDisplay = limit === "all"
    ? historyLogs
    : historyLogs.slice((currentPage - 1) * limit, currentPage * limit);

  const totalPages = limit === "all" ? 1 : Math.ceil(historyLogs.length / limit);

  const loadData = useCallback(async () => {
    if (!token || !selectedDevice?.id) return;
    
    setIsRecLoading(true);
    setIsHistoryLoading(true);

    try {
      const recData = await fetchDeviceRecommendation(token, selectedDevice.id);
      setRecommendation(recData);
    } catch (err) {
      console.error("Gagal memuat rekomendasi alat:", err);
      setRecommendation(null);
    } finally {
      setIsRecLoading(false);
    }

    try {
      const historyData = await fetchRecommendationHistory(token, selectedDevice.id);
      setHistoryLogs(historyData);
      setCurrentPage(1)
    } catch (err) {
      console.error("Gagal memuat riwayat rekomendasi:", err);
      setHistoryLogs([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [token, selectedDevice?.id]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData]);

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

  const getCategoryLabel = (code: string) => {
    const map: Record<string, string> = {
      C1: "Kondisi Optimal",
      C2: "Perlu Penyiraman",
      C3: "Kelebihan Air",
      C4: "Tanah Asam (Perlu Kapur)",
      C5: "Tanah Asam & Kering",
      C6: "Tanah Asam & Jenuh Air",
      C7: "Tanah Basa (Perlu Sulfur)",
      C8: "Tanah Basa & Kering",
      C9: "Tanah Basa & Jenuh Air",
    };
    return map[code] || code;
  };

  const getCategoryBadgeClass = (code: string) => {
    if (code === "C1") {
      return "bg-emerald-100/80 border-emerald-500/20 text-emerald-700";
    }
    if (["C3", "C6", "C9"].includes(code)) {
      return "bg-rose-100/80 border-rose-500/20 text-rose-700";
    }
    if (["C2", "C5", "C8"].includes(code)) {
      return "bg-sky-100/80 border-sky-500/20 text-sky-700";
    }
    return "bg-amber-100/80 border-amber-500/20 text-amber-700";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-primary">
            Rekomendasi Treatment
          </h2>
        </div>

        <div className="relative">
          <label className="sr-only" htmlFor="rec-device-selector">Pilih Alat</label>
          <select
            id="rec-device-selector"
            value={selectedDevice.id}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="appearance-none w-full sm:w-64 rounded-xl border border-black/10 bg-white pl-4 pr-10 py-2.5 text-sm font-bold text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer shadow-sm"
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/6">
          <div className="flex items-center gap-2">
            <MdOutlineSpa className="text-primary" size={20} />
            <h3 className="text-sm font-bold text-primary">
              Rekomendasi Perawatan {plantName}
            </h3>
          </div>
          <button
            onClick={loadData}
            disabled={isRecLoading}
            className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            {isRecLoading ? "Memproses..." : "Hitung Ulang"}
          </button>
        </div>

        <div className="p-6">
          {isRecLoading ? (
            <div className="flex flex-col items-center justify-center py-16 animate-pulse">
              <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <p className="text-xs text-gray-400 mt-4 font-semibold">Mengalkulasi status tanah & dosis treatment...</p>
            </div>
          ) : !recommendation ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-14 w-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mb-4">
                <MdWarningAmber size={28} />
              </div>
              <p className="text-sm font-bold text-gray-700">Belum Ada Rekomendasi Terhitung</p>
              <p className="text-xs text-gray-400 mt-1.5 max-w-sm leading-relaxed">
                Silakan nyalakan alat sensor ESP32 Anda untuk mulai menyuplai telemetri sensor pH dan kelembapan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-50 border border-black/5">
                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Diagnosis AI</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-black ${getCategoryBadgeClass(recommendation.categoryCode)}`}>
                      {getCategoryLabel(recommendation.categoryCode)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 md:border-l md:border-black/5 md:pl-6 items-center">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">pH Sensor</span>
                    <span className="text-base font-extrabold text-emerald-600">{recommendation.phValue.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold block">Kelembapan</span>
                    <span className="text-base font-extrabold text-sky-600">{recommendation.moistureValue.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <MdGrass className="text-emerald-500" size={16} />
                  Tindakan Perawatan yang Direkomendasikan:
                </span>
                <div className="text-sm text-gray-700 leading-relaxed font-semibold bg-emerald-50/20 border border-emerald-500/10 rounded-2xl p-5 shadow-inner">
                  {recommendation.actionText}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <MdScience className="text-violet-500" size={16} />
                  Panduan Dosis Pengairan & Nutrisi Media:
                </span>

                {recommendation.waterVolumeLiter === 0 &&
                recommendation.limeDosageGram === 0 &&
                recommendation.sulfurDosageGram === 0 &&
                !recommendation.reduceWatering ? (
                  <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-5 shadow-sm">
                    <MdCheckCircleOutline className="text-emerald-500 shrink-0 mt-0.5 animate-pulse" size={20} />
                    <div>
                      <p className="text-sm font-extrabold text-emerald-800">Kondisi Media Sangat Optimal!</p>
                      <p className="text-xs text-emerald-700/80 mt-1 leading-relaxed">
                        Tingkat keasaman (pH) dan kelembapan tanah Anda saat ini berada dalam kondisi prima untuk varietas **{plantName}**. Lanjutkan rutinitas perawatan saat ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendation.waterVolumeLiter > 0 && (
                      <div className="relative group overflow-hidden flex items-start gap-3 rounded-2xl bg-sky-50 border border-sky-200/55 p-4 shadow-sm hover:shadow transition-all duration-300">
                        <div className="absolute right-[-10px] bottom-[-10px] text-sky-200/40 opacity-50 group-hover:scale-110 transition-transform duration-300">
                          <MdOpacity size={80} />
                        </div>
                        <MdOpacity className="text-sky-500 shrink-0 mt-0.5 animate-bounce" size={20} />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-sky-800">Dosis Pengairan</p>
                          <p className="text-2xl font-black text-sky-600 mt-1">
                            {recommendation.waterVolumeLiter.toFixed(2)}{" "}
                            <span className="text-xs font-bold text-sky-500">Liter</span>
                          </p>
                          <p className="text-[11px] text-sky-600/70 mt-1 leading-relaxed max-w-[85%]">
                            Siram media tanah secara perlahan untuk mengembalikan kelembapan ideal.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.reduceWatering && (
                      <div className="relative group overflow-hidden flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200/55 p-4 shadow-sm hover:shadow transition-all duration-300">
                        <div className="absolute right-[-10px] bottom-[-10px] text-rose-200/40 opacity-50 group-hover:scale-110 transition-transform duration-300">
                          <MdWarningAmber size={80} />
                        </div>
                        <MdWarningAmber className="text-rose-500 shrink-0 mt-0.5" size={20} />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-rose-800">Perhatian Air Jenuh</p>
                          <p className="text-lg font-black text-rose-600 mt-1.5">Hentikan Siram</p>
                          <p className="text-[11px] text-rose-600/70 mt-1 leading-relaxed max-w-[85%]">
                            Kondisi tanah jenuh. Hentikan pengairan sementara untuk mencegah terjadinya busuk akar tanaman.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lime (Dolomite) Box */}
                    {recommendation.limeDosageGram > 0 && (
                      <div className="relative group overflow-hidden flex items-start gap-3 rounded-2xl bg-emerald-50 border border-emerald-200/55 p-4 shadow-sm hover:shadow transition-all duration-300">
                        <div className="absolute right-[-10px] bottom-[-10px] text-emerald-200/40 opacity-50 group-hover:scale-110 transition-transform duration-300">
                          <MdScience size={80} />
                        </div>
                        <MdScience className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-emerald-800">Dolomit (Naikkan pH)</p>
                          <p className="text-2xl font-black text-emerald-600 mt-1">
                            {recommendation.limeDosageGram.toFixed(1)}{" "}
                            <span className="text-xs font-bold text-emerald-500">Gram</span>
                          </p>
                          <p className="text-[11px] text-emerald-600/70 mt-1 leading-relaxed max-w-[85%]">
                            Taburkan Kapur Dolomit secara merata untuk menetralkan keasaman media.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.sulfurDosageGram > 0 && (
                      <div className="relative group overflow-hidden flex items-start gap-3 rounded-2xl bg-violet-50 border border-violet-200/55 p-4 shadow-sm hover:shadow transition-all duration-300">
                        <div className="absolute right-[-10px] bottom-[-10px] text-violet-200/40 opacity-50 group-hover:scale-110 transition-transform duration-300">
                          <MdScience size={80} />
                        </div>
                        <MdScience className="text-violet-500 shrink-0 mt-0.5" size={20} />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-violet-800">Belerang (Turunkan pH)</p>
                          <p className="text-2xl font-black text-violet-600 mt-1">
                            {recommendation.sulfurDosageGram.toFixed(1)}{" "}
                            <span className="text-xs font-bold text-violet-500">Gram</span>
                          </p>
                          <p className="text-[11px] text-violet-600/70 mt-1 leading-relaxed max-w-[85%]">
                            Taburkan sulfur elemental untuk menurunkan alkalinitas tanah yang berlebih.
                          </p>
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

      <div className="rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between px-5 py-4 border-b border-black/6 bg-gray-50 gap-4">
          <div className="flex items-center gap-2">
            <MdHistory className="text-primary" size={20} />
            <h3 className="text-sm font-bold text-primary">Riwayat Log Rekomendasi</h3>
          </div>

          {historyLogs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Tampilkan:</span>
              <select
                id="logs-limit-select"
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value === "all" ? "all" : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm"
              >
                <option value={10}>10 data</option>
                <option value={20}>20 data</option>
                <option value={50}>50 data</option>
                <option value="all">Semua data</option>
              </select>
            </div>
          )}
        </div>

        <div className="p-0">
          {isHistoryLoading ? (
            <div className="flex flex-col items-center justify-center py-16 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="h-4 bg-gray-100 rounded w-64"></div>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="h-12 w-12 rounded-xl bg-gray-50 border border-black/5 text-gray-400 flex items-center justify-center mb-3">
                <MdHistory size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700">Belum Ada Histori Log</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm leading-relaxed">
                Histori log otomatis akan terisi setelah telemetri sensor alat aktif Anda berhasil terekam ke Postgres.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-black/6 text-gray-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-3">Waktu</th>
                      <th className="px-5 py-3">Sensor</th>
                      <th className="px-5 py-3">Diagnosis AI</th>
                      <th className="px-5 py-3 text-right">Rekomendasi Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {logsToDisplay.map((log) => {
                      const hasDose = log.waterVolumeLiter > 0 || log.limeDosageGram > 0 || log.sulfurDosageGram > 0;
                      
                      return (
                        <tr key={log.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-5 py-3.5 font-semibold text-gray-700 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <MdSchedule className="text-gray-400" size={13} />
                              {new Date(log.createdAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "medium",
                              })}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p className="font-bold text-gray-800">
                                pH: <span className="text-emerald-600 font-black">{log.phValue.toFixed(1)}</span>
                              </p>
                              <p className="text-gray-500 font-medium">
                                Lembap: <span className="text-sky-600 font-bold">{log.moistureValue.toFixed(0)}%</span>
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black ${getCategoryBadgeClass(log.categoryCode)}`}>
                              {getCategoryLabel(log.categoryCode)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1">
                              {!hasDose && !log.reduceWatering ? (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-500/10">
                                  Aman (Pertahankan)
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                                  {log.waterVolumeLiter > 0 && (
                                    <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 border border-sky-500/10">
                                      Air: {log.waterVolumeLiter.toFixed(1)}L
                                    </span>
                                  )}
                                  {log.reduceWatering && (
                                    <span className="inline-flex items-center rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 border border-rose-500/10">
                                      Hentikan Siram
                                    </span>
                                  )}
                                  {log.limeDosageGram > 0 && (
                                    <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-500/10">
                                      Kapur: {log.limeDosageGram.toFixed(0)}g
                                    </span>
                                  )}
                                  {log.sulfurDosageGram > 0 && (
                                    <span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 border border-violet-500/10">
                                      Sulfur: {log.sulfurDosageGram.toFixed(0)}g
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sleek Pagination Bar */}
              {limit !== "all" && historyLogs.length > limit && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-black/5 bg-gray-50/50">
                  <span className="text-xs text-gray-400 font-semibold text-center sm:text-left">
                    Menampilkan <span className="font-bold text-gray-700">{((currentPage - 1) * limit) + 1}</span> -{" "}
                    <span className="font-bold text-gray-700">{Math.min(currentPage * limit, historyLogs.length)}</span> dari{" "}
                    <span className="font-bold text-gray-700">{historyLogs.length}</span> data
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 rounded-xl border border-black/8 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer shadow-sm"
                    >
                      Sebelumnya
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const isCurrent = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm ${
                            isCurrent
                              ? "bg-primary text-white border border-primary font-black"
                              : "border border-black/8 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 rounded-xl border border-black/8 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition cursor-pointer shadow-sm"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
