"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MdOutlineSpa,
  MdAutoAwesome,
  MdOpacity,
  MdScience,
  MdGrass,
  MdCheckCircleOutline,
  MdWarningAmber,
  MdOutlineArrowDropDown,
  MdHistory,
  MdSchedule,
} from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import { useSelectedDeviceStore } from "@/stores/selectedDeviceStore";
import {
  fetchDeviceRecommendationResult,
  fetchRecommendationHistory,
} from "@/services/deviceService";
import type {
  DeviceRecommendation,
  RecommendationLogItem,
} from "@/types/device";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ApplicationGuide from "@/components/recommendations/ApplicationGuide";
import CorrectionPanel from "@/components/recommendations/CorrectionPanel";
import PageHeader from "@/components/dashboard/PageHeader";

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-neutral-200"></div>
          <div className="h-4 w-64 rounded bg-neutral-100"></div>
        </div>
        <div className="h-10 w-60 rounded bg-neutral-200"></div>
      </div>
      <div className="h-64 rounded-3xl bg-neutral-200"></div>
      <div className="h-80 rounded-3xl bg-neutral-200"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="mx-auto my-8 max-w-xl items-center justify-center rounded-3xl border-dashed p-8 py-20 text-center">
      <div className="bg-primary/8 text-primary mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
        <MdAutoAwesome size={40} className="motion-safe:animate-pulse" />
      </div>
      <h3 className="text-lg font-bold text-neutral-800">
        Belum Ada Alat Terdaftar
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
        Silakan hubungkan perangkat Anda terlebih dahulu pada tab
        &quot;Perangkat&quot; untuk melihat kalkulasi rekomendasi agronomis
        otomatis dari AI.
      </p>
    </Card>
  );
}

export default function RecommendationsPage() {
  const { devices, isLoading, token, loadDevices } = useDevices();
  const { selectedDeviceId, setSelectedDeviceId } = useSelectedDeviceStore();

  const [recommendation, setRecommendation] =
    useState<DeviceRecommendation | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(
    null,
  );
  const [recommendationMessage, setRecommendationMessage] = useState("");

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
      const result = await fetchDeviceRecommendationResult(
        token,
        selectedDevice.id,
      );
      setRecommendation(result.data);
      setRecommendationMessage(result.message);
      setRecommendationError(null);
    } catch (err) {
      setRecommendation(null);
      setRecommendationMessage("");
      setRecommendationError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat memuat rekomendasi.",
      );
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
  }, [loadData]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (devices.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState />
        <ApplicationGuide recommendation={null} />
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-sm font-semibold text-neutral-500">
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
      return "bg-primary/10 border-primary-light/20 text-primary";
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
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <PageHeader
        title="Rekomendasi Perawatan"
        description="Saran penyiraman dan koreksi pH berdasarkan data sensor terbaru."
      >
        <div className="relative">
          <label className="sr-only" htmlFor="rec-device-selector">
            Pilih Alat
          </label>
          <select
            id="rec-device-selector"
            value={selectedDevice.id}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 pr-10 pl-4 text-sm font-bold text-neutral-700 shadow-sm transition focus:ring-2 focus:outline-none sm:w-64"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500">
            <MdOutlineArrowDropDown size={20} />
          </div>
        </div>
      </PageHeader>

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
            className="text-primary focus-visible:ring-primary/40 flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRecLoading ? "Memproses..." : "Perbarui rekomendasi"}
          </button>
        </CardHeader>

        <CardContent className="p-6">
          {isRecLoading ? (
            <div className="flex animate-pulse flex-col items-center justify-center py-16">
              <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
              <p className="mt-4 text-xs font-semibold text-neutral-400">
                Mengalkulasi status tanah & dosis treatment...
              </p>
            </div>
          ) : !recommendation ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                <MdWarningAmber size={28} />
              </div>
              <p className="text-sm font-bold text-neutral-700">
                {recommendationError
                  ? "Gagal Memuat Rekomendasi"
                  : "Belum Ada Rekomendasi Terhitung"}
              </p>
              <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-400">
                {recommendationError ||
                  recommendationMessage ||
                  "Rekomendasi belum tersedia untuk perangkat ini."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:grid-cols-3">
                <div className="space-y-1 md:col-span-2">
                  <span className="block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
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

                <div className="flex items-center gap-4 md:border-l md:border-neutral-200 md:pl-6">
                  <div>
                    <span className="block text-xs font-semibold text-neutral-400">
                      pH Sensor
                    </span>
                    <span className="text-primary-light text-base font-extrabold">
                      {recommendation.phValue.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-neutral-400">
                      Kelembapan (VWC)
                    </span>
                    <span className="text-base font-extrabold text-sky-600">
                      {recommendation.moistureValue.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                  <MdGrass className="text-primary-light" size={16} />
                  Tindakan Perawatan yang Direkomendasikan:
                </span>
                <div className="border-primary-light/10 bg-primary/5 rounded-2xl border p-5 text-sm leading-relaxed font-semibold text-neutral-700 shadow-inner">
                  {recommendation.actionText}
                </div>
              </div>

              <div className="space-y-3">
                <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-600">
                  <MdScience className="text-primary-light" size={16} />
                  Panduan Dosis Pengairan & Nutrisi Media:
                </span>

                {recommendation.waterVolumeLiter === 0 &&
                recommendation.limeDosageGram === 0 &&
                recommendation.sulfurDosageGram === 0 &&
                !recommendation.reduceWatering ? (
                  <div className="border-primary/10 bg-primary/5 flex items-start gap-3 rounded-2xl border p-5 shadow-sm">
                    <MdCheckCircleOutline
                      className="text-primary-light mt-0.5 shrink-0"
                      size={20}
                    />
                    <div>
                      <p className="text-primary text-sm font-extrabold">
                        Tidak Ada Dosis Tambahan pada Respons Ini
                      </p>
                      <p className="text-primary/80 mt-1 text-xs leading-relaxed">
                        Dosis nol tidak selalu berarti media optimal. Ikuti
                        status pemantauan dan alasan dari backend di atas
                        sebelum memberikan treatment.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {recommendation.waterVolumeLiter > 0 && (
                      <div className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-sky-200/55 bg-sky-50 p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="absolute -right-2.5 -bottom-2.5 text-sky-200/40 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdOpacity size={80} />
                        </div>
                        <MdOpacity
                          className="mt-0.5 shrink-0 text-sky-500"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-xs font-extrabold text-sky-800">
                            Dosis Pengairan
                          </p>
                          <p className="mt-1 text-2xl font-black text-sky-600">
                            {Math.round(recommendation.waterVolumeLiter * 1000)}{" "}
                            <span className="text-xs font-bold text-sky-500">
                              mL
                            </span>
                          </p>
                          <p className="mt-1 max-w-[85%] text-[11px] leading-relaxed text-sky-600/70">
                            Estimasi berbasis VWC. Siram perlahan dan hentikan
                            bila air sudah menetes keluar.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.reduceWatering && (
                      <div className="group relative flex items-start gap-3 overflow-hidden rounded-2xl border border-rose-200/55 bg-rose-50 p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="absolute -right-2.5 -bottom-2.5 text-rose-200/40 opacity-50 transition-transform duration-300 group-hover:scale-110">
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
                      <div className="group border-primary/20 bg-primary/5 relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="text-primary-light/40 absolute -right-2.5 -bottom-2.5 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdScience size={80} />
                        </div>
                        <MdScience
                          className="text-primary-light mt-0.5 shrink-0"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-primary text-xs font-extrabold">
                            Dolomit (Naikkan pH)
                          </p>
                          <p className="text-primary-light mt-1 text-2xl font-black">
                            {recommendation.limeDosageGram.toFixed(1)}{" "}
                            <span className="text-primary-light text-xs font-bold">
                              Gram
                            </span>
                          </p>
                          <p className="text-primary-light/70 mt-1 max-w-[85%] text-[11px] leading-relaxed">
                            Taburkan Kapur Dolomit secara merata untuk
                            menetralkan keasaman media.
                          </p>
                        </div>
                      </div>
                    )}

                    {recommendation.sulfurDosageGram > 0 && (
                      <div className="group border-primary/20 bg-primary/5 relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:shadow">
                        <div className="text-primary-light/40 absolute -right-2.5 -bottom-2.5 opacity-50 transition-transform duration-300 group-hover:scale-110">
                          <MdScience size={80} />
                        </div>
                        <MdScience
                          className="text-primary-light mt-0.5 shrink-0"
                          size={20}
                        />
                        <div className="z-10">
                          <p className="text-primary text-xs font-extrabold">
                            Belerang (Turunkan pH)
                          </p>
                          <p className="text-primary-light mt-1 text-2xl font-black">
                            {recommendation.sulfurDosageGram.toFixed(1)}{" "}
                            <span className="text-primary-light text-xs font-bold">
                              Gram
                            </span>
                          </p>
                          <p className="text-primary-light/70 mt-1 max-w-[85%] text-[11px] leading-relaxed">
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

      <ApplicationGuide recommendation={recommendation} />

      {token && (
        <CorrectionPanel
          key={selectedDevice.id}
          token={token}
          deviceId={selectedDevice.id}
          recommendation={recommendation}
          onSaved={loadData}
        />
      )}

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
              <span className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
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
                className="focus:ring-primary min-h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm focus:ring-1 focus:outline-none"
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
              <div className="mb-3 h-6 w-48 rounded bg-neutral-200"></div>
              <div className="h-4 w-64 rounded bg-neutral-100"></div>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400">
                <MdHistory size={24} />
              </div>
              <p className="text-sm font-bold text-neutral-700">
                Belum Ada Histori Log
              </p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-400">
                Histori log otomatis akan terisi setelah telemetri sensor alat
                aktif Anda berhasil terekam ke Postgres.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50 font-bold tracking-wider text-neutral-400 uppercase">
                      <th scope="col" className="px-5 py-3">
                        Waktu
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Sensor
                      </th>
                      <th scope="col" className="px-5 py-3">
                        Diagnosis AI
                      </th>
                      <th scope="col" className="px-5 py-3 text-right">
                        Rekomendasi Tindakan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
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
                          <td className="px-5 py-3.5 font-semibold whitespace-nowrap text-neutral-700">
                            <div className="flex items-center gap-1.5">
                              <MdSchedule
                                className="text-neutral-400"
                                size={13}
                              />
                              {new Date(log.createdAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "medium",
                              })}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <p className="font-bold text-neutral-800">
                                pH:{" "}
                                <span className="text-primary-light font-black">
                                  {log.phValue.toFixed(1)}
                                </span>
                              </p>
                              <p className="font-medium text-neutral-500">
                                VWC:{" "}
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
                                <span className="border-primary-light/10 bg-primary/5 text-primary inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold">
                                  Aman (Pertahankan)
                                </span>
                              ) : (
                                <div className="flex max-w-50 flex-wrap justify-end gap-1">
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
                                    <span className="border-primary-light/10 bg-primary/5 text-primary inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold">
                                      Kapur: {log.limeDosageGram.toFixed(0)}g
                                    </span>
                                  )}
                                  {log.sulfurDosageGram > 0 && (
                                    <span className="border-primary-light/10 bg-primary/5 text-primary inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold">
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
                <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-200 bg-neutral-50/50 px-5 py-4 sm:flex-row">
                  <span className="text-center text-xs font-semibold text-neutral-400 sm:text-left">
                    Menampilkan{" "}
                    <span className="font-bold text-neutral-700">
                      {(currentPage - 1) * limit + 1}
                    </span>{" "}
                    -{" "}
                    <span className="font-bold text-neutral-700">
                      {Math.min(currentPage * limit, historyLogs.length)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-bold text-neutral-700">
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
                      className="min-h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:opacity-40"
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
                          className={`min-h-10 min-w-10 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                            isCurrent
                              ? "bg-primary border-primary border font-black text-white"
                              : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
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
                      className="min-h-10 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-600 shadow-sm transition hover:bg-neutral-50 disabled:opacity-40"
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
