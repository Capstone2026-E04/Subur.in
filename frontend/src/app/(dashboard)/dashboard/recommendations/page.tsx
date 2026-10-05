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
import type {
  RegisteredDevice,
  DeviceRecommendation,
  RecommendationLogItem,
} from "@/types/device";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-black/5 pb-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-gray-200"></div>
          <div className="h-4 w-64 rounded bg-gray-100"></div>
        </div>
        <div className="h-10 w-60 rounded bg-gray-200"></div>
      </div>
      <div className="h-64 rounded-3xl bg-gray-200"></div>
      <div className="h-80 rounded-3xl bg-gray-200"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="mx-auto my-8 max-w-xl items-center justify-center rounded-3xl border-dashed p-8 py-20 text-center">
      <div className="bg-primary/8 text-primary mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <MdAutoAwesome size={40} className="animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-gray-800">
        Belum Ada Alat Terdaftar
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
        Silakan hubungkan perangkat Anda terlebih dahulu pada tab "Perangkat"
        untuk melihat kalkulasi rekomendasi agronomis otomatis dari AI.
      </p>
    </Card>
  );
}

export default function RecommendationsPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [recommendation, setRecommendation] =
    useState<DeviceRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);

  const [historyLogs, setHistoryLogs] = useState<RecommendationLogItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState<number | "all">(20);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const selectedDevice =
    devices.find((d) => d.id === selectedDeviceId) || devices[0] || null;

  const logsToDisplay =
    limit === "all"
      ? historyLogs
      : historyLogs.slice((currentPage - 1) * limit, currentPage * limit);

  const totalPages =
    limit === "all" ? 1 : Math.ceil(historyLogs.length / limit);

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
      const historyData = await fetchRecommendationHistory(
        token,
        selectedDevice.id,
      );
      setHistoryLogs(historyData);
      setCurrentPage(1);
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
        <p className="text-sm font-semibold text-gray-500">
          Memuat perangkat...
        </p>
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
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-primary text-xl font-black tracking-tight">
            Rekomendasi Perawatan
          </h2>
        </div>

        <div className="relative">
          <label className="sr-only" htmlFor="rec-device-selector">
            Pilih Alat
          </label>
          <select
            id="rec-device-selector"
            value={selectedDevice.id}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer appearance-none rounded-xl border border-black/10 bg-white py-2.5 pr-10 pl-4 text-sm font-bold text-gray-700 shadow-sm transition focus:ring-2 focus:outline-none sm:w-64"
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
        <CardHeader className="py-4">
          <div className="flex items-center gap-2">
            <MdOutlineSpa className="text-primary" size={20} />
            <h3 className="text-primary text-sm font-bold">
              Rekomendasi Perawatan {plantName}
            </h3>
          </div>
          <button
            onClick={loadData}
            disabled={isRecLoading}
            className="text-primary flex cursor-pointer items-center gap-1 text-xs font-bold hover:underline"
          >
            {isRecLoading ? "Memproses..." : "Hitung Ulang"}
          </button>
        </CardHeader>

        <CardContent className="p-6">
          {isRecLoading ? (
            <div className="flex animate-pulse flex-col items-center justify-center py-16">
              <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
              <p className="mt-4 text-xs font-semibold text-gray-400">
                Mengalkulasi status tanah & dosis treatment...
              </p>
            </div>
          ) : !recommendation ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <MdWarningAmber size={28} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                Belum Ada Rekomendasi Terhitung
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-gray-400">
                Silakan nyalakan alat sensor ESP32 Anda untuk mulai menyuplai
                telemetri sensor pH dan kelembapan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-black/5 bg-gray-50 p-4 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <span className="block text-xs font-semibold tracking-wider text-gray-400 uppercase">
                    Diagnosis AI
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-black ${getCategoryBadgeClass(recommendation.categoryCode)}`}
                    >
                      {getCategoryLabel(recommendation.categoryCode)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:border-l md:border-black/5 md:pl-6">
                  <div>
                    <span className="block text-xs font-semibold text-gray-400">
                      pH Sensor
                    </span>
                    <span className="text-base font-extrabold text-emerald-600">
                      {recommendation.phValue.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-gray-400">
                      Kelembapan
                    </span>
                    <span className="text-base font-extrabold text-sky-600">
                      {recommendation.moistureValue.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <MdGrass className="text-emerald-500" size={16} />
                  Tindakan Perawatan yang Direkomendasikan:
                </span>
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-50/20 p-5 text-sm leading-relaxed font-semibold text-gray-700 shadow-inner">
                  {recommendation.actionText}
                </div>
              </div>

              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                  <MdScience className="text-violet-500" size={16} />
                  Panduan Dosis Pengairan & Nutrisi Media:
                </span>

                {recommendation.waterVolumeLiter === 0 &&
                recommendation.limeDosageGram === 0 &&
                recommendation.sulfurDosageGram === 0 &&
                !recommendation.reduceWatering ? (
                  <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                    <MdCheckCircleOutline
                      className="mt-0.5 shrink-0 animate-pulse text-emerald-500"
                      size={20}
                    />
                    <div>
                      <p className="text-sm font-extrabold text-emerald-800">
                        Kondisi Media Sangat Optimal!
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-700/80">
                        Tingkat keasaman (pH) dan kelembapan tanah Anda saat ini
                        berada dalam kondisi prima untuk varietas{" "}
                        <strong>{plantName}</strong>. Lanjutkan rutinitas
                        perawatan saat ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {recommendation.waterVolumeLiter > 0 && (
                      <div className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-sky-200/55 bg-sky-50 p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="absolute right-[-10px] bottom-[-10px] text-sky-200/40 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdOpacity size={80} />
                        </div>
                        <MdOpacity
                          className="mt-0.5 shrink-0 animate-bounce text-sky-500"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-sky-800">
                            Dosis Pengairan
                          </p>
                          <p className="mt-1 text-2xl font-black text-sky-600">
                            {recommendation.waterVolumeLiter.toFixed(2)}{" "}
                            <span className="text-xs font-bold text-sky-500">
                              Liter
                            </span>
                          </p>
                          <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-sky-600/70">
                            Siram media tanah secara perlahan untuk
                            mengembalikan kelembapan ideal.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.reduceWatering && (
                      <div className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-rose-200/55 bg-rose-50 p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="absolute right-[-10px] bottom-[-10px] text-rose-200/40 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdWarningAmber size={80} />
                        </div>
                        <MdWarningAmber
                          className="mt-0.5 shrink-0 text-rose-500"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-rose-800">
                            Perhatian Air Jenuh
                          </p>
                          <p className="mt-1.5 text-lg font-black text-rose-600">
                            Hentikan Siram
                          </p>
                          <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-rose-600/70">
                            Kondisi tanah jenuh. Hentikan pengairan sementara
                            untuk mencegah terjadinya busuk akar tanaman.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.limeDosageGram > 0 && (
                      <div className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-emerald-200/55 bg-emerald-50 p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="absolute right-[-10px] bottom-[-10px] text-emerald-200/40 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdScience size={80} />
                        </div>
                        <MdScience
                          className="mt-0.5 shrink-0 text-emerald-500"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-emerald-800">
                            Dolomit (Naikkan pH)
                          </p>
                          <p className="mt-1 text-2xl font-black text-emerald-600">
                            {recommendation.limeDosageGram.toFixed(1)}{" "}
                            <span className="text-xs font-bold text-emerald-500">
                              Gram
                            </span>
                          </p>
                          <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-emerald-600/70">
                            Taburkan Kapur Dolomit secara merata untuk
                            menetralkan keasaman media.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.sulfurDosageGram > 0 && (
                      <div className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-violet-200/55 bg-violet-50 p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="absolute right-[-10px] bottom-[-10px] text-violet-200/40 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdScience size={80} />
                        </div>
                        <MdScience
                          className="mt-0.5 shrink-0 text-violet-500"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-violet-800">
                            Belerang (Turunkan pH)
                          </p>
                          <p className="mt-1 text-2xl font-black text-violet-600">
                            {recommendation.sulfurDosageGram.toFixed(1)}{" "}
                            <span className="text-xs font-bold text-violet-500">
                              Gram
                            </span>
                          </p>
                          <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-violet-600/70">
                            Taburkan sulfur elemental untuk menurunkan
                            alkalinitas tanah yang berlebih.
                          </p>
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

      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/60 flex-wrap gap-4 py-4">
          <div className="flex items-center gap-2">
            <MdHistory className="text-primary" size={20} />
            <h3 className="text-primary text-sm font-bold">
              Riwayat Log Rekomendasi
            </h3>
          </div>

          {historyLogs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                Tampilkan:
              </span>
              <select
                id="logs-limit-select"
                value={limit}
                onChange={(e) => {
                  setLimit(
                    e.target.value === "all" ? "all" : Number(e.target.value),
                  );
                  setCurrentPage(1);
                }}
                className="focus:ring-primary cursor-pointer rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 shadow-sm focus:ring-1 focus:outline-none"
              >
                <option value={10}>10 data</option>
                <option value={20}>20 data</option>
                <option value={50}>50 data</option>
                <option value="all">Semua data</option>
              </select>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isHistoryLoading ? (
            <div className="flex animate-pulse flex-col items-center justify-center py-16">
              <div className="mb-3 h-6 w-48 rounded bg-gray-200"></div>
              <div className="h-4 w-64 rounded bg-gray-100"></div>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-black/5 bg-gray-50 text-gray-400">
                <MdHistory size={24} />
              </div>
              <p className="text-sm font-bold text-gray-700">
                Belum Ada Histori Log
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-400">
                Histori log otomatis akan terisi setelah telemetri sensor alat
                aktif Anda berhasil terekam ke Postgres.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-black/6 bg-gray-50 font-bold tracking-wider text-gray-400 uppercase">
                      <th className="px-5 py-3">Waktu</th>
                      <th className="px-5 py-3">Sensor</th>
                      <th className="px-5 py-3">Diagnosis AI</th>
                      <th className="px-5 py-3 text-right">
                        Rekomendasi Tindakan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {logsToDisplay.map((log) => {
                      const hasDose =
                        log.waterVolumeLiter > 0 ||
                        log.limeDosageGram > 0 ||
                        log.sulfurDosageGram > 0;

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-primary/5 group transition-colors"
                        >
                          <td className="px-5 py-3.5 font-semibold whitespace-nowrap text-gray-700">
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
                                pH:{" "}
                                <span className="font-black text-emerald-600">
                                  {log.phValue.toFixed(1)}
                                </span>
                              </p>
                              <p className="font-medium text-gray-500">
                                Lembap:{" "}
                                <span className="font-bold text-sky-600">
                                  {log.moistureValue.toFixed(0)}%
                                </span>
                              </p>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-black ${getCategoryBadgeClass(log.categoryCode)}`}
                            >
                              {getCategoryLabel(log.categoryCode)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1">
                              {!hasDose && !log.reduceWatering ? (
                                <span className="inline-flex items-center rounded-md border border-emerald-500/10 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Aman (Pertahankan)
                                </span>
                              ) : (
                                <div className="flex max-w-[200px] flex-wrap justify-end gap-1">
                                  {log.waterVolumeLiter > 0 && (
                                    <span className="inline-flex items-center rounded border border-sky-500/10 bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                                      Air: {log.waterVolumeLiter.toFixed(1)}L
                                    </span>
                                  )}
                                  {log.reduceWatering && (
                                    <span className="inline-flex items-center rounded border border-rose-500/10 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                      Hentikan Siram
                                    </span>
                                  )}
                                  {log.limeDosageGram > 0 && (
                                    <span className="inline-flex items-center rounded border border-emerald-500/10 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                      Kapur: {log.limeDosageGram.toFixed(0)}g
                                    </span>
                                  )}
                                  {log.sulfurDosageGram > 0 && (
                                    <span className="inline-flex items-center rounded border border-violet-500/10 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
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

              {limit !== "all" && historyLogs.length > limit && (
                <div className="flex flex-col items-center justify-between gap-4 border-t border-black/5 bg-gray-50/50 px-5 py-4 sm:flex-row">
                  <span className="text-center text-xs font-semibold text-gray-400 sm:text-left">
                    Menampilkan{" "}
                    <span className="font-bold text-gray-700">
                      {(currentPage - 1) * limit + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-bold text-gray-700">
                      {Math.min(currentPage * limit, historyLogs.length)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-bold text-gray-700">
                      {historyLogs.length}
                    </span>{" "}
                    data
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      className="cursor-pointer rounded-xl border border-black/8 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-40"
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
                          className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                            isCurrent
                              ? "bg-primary border-primary border font-black text-white"
                              : "border border-black/8 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      className="cursor-pointer rounded-xl border border-black/8 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
