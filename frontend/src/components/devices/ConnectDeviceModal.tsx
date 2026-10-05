"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdOutlineWifi,
  MdClose,
  MdRefresh,
  MdOutlineDeviceHub,
  MdOutlineSpa,
  MdOutlineWaterDrop,
  MdOutlineLabel,
  MdSignalWifiOff,
  MdLinkOff,
  MdAccessTime,
} from "react-icons/md";
import type {
  DiscoveredDevice,
  PlantOption,
  PolybagOption,
} from "@/types/device";
import {
  fetchDiscoveredDevices,
  fetchPlants,
  fetchPolybags,
} from "@/services/deviceService";

interface ConnectDeviceModalProps {
  isOpen: boolean;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
  onClaim: (payload: {
    deviceCode: string;
    label: string;
    plantId: string;
    polybagId: string;
    sensorInterval?: number;
  }) => Promise<unknown>;
}

function formatDiscoveredAge(ts: string): string {
  try {
    const secs = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (secs < 60) return `Terdeteksi ${secs} detik lalu`;
    const mins = Math.floor(secs / 60);
    return `Terdeteksi ${mins} menit lalu`;
  } catch {
    return "Terdeteksi baru saja";
  }
}

type ScanStatus = "idle" | "scanning" | "done" | "error";

export default function ConnectDeviceModal({
  isOpen,
  token,
  onClose,
  onSuccess,
  onClaim,
}: ConnectDeviceModalProps) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [polybags, setPolybags] = useState<PolybagOption[]>([]);

  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [label, setLabel] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [selectedPolybagId, setSelectedPolybagId] = useState("");
  const [sensorInterval, setSensorInterval] = useState(15);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [prevIsOpen, setPrevIsOpen] = useState(false);

  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setSelectedDeviceId("");
    setLabel("");
    setSelectedPlantId("");
    setSelectedPolybagId("");
    setSensorInterval(15);
    setFormError(null);
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  const scan = useCallback(async () => {
    if (!token) return;
    setScanStatus("scanning");
    setScanError(null);
    try {
      const data = await fetchDiscoveredDevices(token);
      setDiscovered(data);
      setScanStatus("done");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Gagal memindai alat.");
      setScanStatus("error");
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen || !token) return;

    const timer = setTimeout(() => {
      scan();
    }, 0);

    Promise.all([fetchPlants(token), fetchPolybags(token)])
      .then(([p, pb]) => {
        setPlants(p);
        setPolybags(pb);
      })
      .catch(() => {});

    return () => clearTimeout(timer);
  }, [isOpen, token, scan]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!selectedDeviceId) {
      setFormError("Pilih alat yang akan dihubungkan.");
      return;
    }
    if (!label.trim()) {
      setFormError("Nama/label alat tidak boleh kosong.");
      return;
    }
    if (!selectedPlantId) {
      setFormError("Pilih tanaman untuk alat ini.");
      return;
    }
    if (!selectedPolybagId) {
      setFormError("Pilih tipe polybag untuk alat ini.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onClaim({
        deviceCode: selectedDeviceId,
        label: label.trim(),
        plantId: selectedPlantId,
        polybagId: selectedPolybagId,
        sensorInterval: Number(sensorInterval),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal menghubungkan alat.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedDeviceInfo = discovered.find(
    (d) => d.deviceCode === selectedDeviceId,
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 top-0 right-0 bottom-0 left-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            key="modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="flex shrink-0 items-center justify-between border-b border-black/6 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
                    <MdOutlineWifi size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-primary text-sm leading-tight font-bold">
                      Hubungkan Alat Baru
                    </h2>
                    <p className="text-xs text-gray-400">
                      Klaim device ESP32 yang terdeteksi di jaringan
                    </p>
                  </div>
                </div>
                <button
                  id="close-connect-modal"
                  onClick={onClose}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Tutup modal"
                >
                  <MdClose size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <form
                  id="connect-device-form"
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5 p-6"
                >
                  <fieldset className="overflow-hidden rounded-xl border border-black/6">
                    <legend className="sr-only">Pilih Alat</legend>
                    <div className="flex items-center justify-between border-b border-black/5 bg-gray-50/80 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MdOutlineDeviceHub
                          size={15}
                          className="text-primary"
                        />
                        <span className="text-xs font-bold text-gray-700">
                          Langkah 1 — Pilih Alat yang Terdeteksi
                        </span>
                      </div>
                      <button
                        type="button"
                        id="rescan-devices-btn"
                        onClick={scan}
                        disabled={scanStatus === "scanning"}
                        className="text-primary hover:bg-primary/8 flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <MdRefresh
                          size={13}
                          className={
                            scanStatus === "scanning" ? "animate-spin" : ""
                          }
                        />
                        {scanStatus === "scanning"
                          ? "Memindai…"
                          : "Pindai Ulang"}
                      </button>
                    </div>

                    <div className="p-4">
                      {scanStatus === "scanning" && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-3 py-6"
                        >
                          <div className="relative flex h-12 w-12 items-center justify-center">
                            <motion.div
                              className="bg-primary/20 absolute h-12 w-12 rounded-full"
                              animate={{
                                scale: [1, 1.6, 1],
                                opacity: [0.6, 0, 0.6],
                              }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                              <MdOutlineWifi
                                size={18}
                                className="text-primary"
                              />
                            </div>
                          </div>
                          <p className="text-xs font-medium text-gray-500">
                            Memindai alat di jaringan…
                          </p>
                        </motion.div>
                      )}

                      {scanStatus === "done" && discovered.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col items-center gap-3 py-6 text-center"
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                            <MdSignalWifiOff size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-700">
                              Tidak ada alat baru terdeteksi
                            </p>
                            <p className="mt-1 max-w-xs text-xs text-gray-400">
                              Pastikan alat ESP32 Anda sudah terhubung ke WiFi
                              dan menyala, lalu klik Pindai Ulang.
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {scanStatus === "error" && (
                        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">
                          <MdLinkOff size={14} className="mt-0.5 shrink-0" />
                          <span>
                            {scanError ?? "Gagal menghubungi server."}
                          </span>
                        </div>
                      )}

                      {scanStatus === "done" && discovered.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col gap-2"
                        >
                          <p className="text-xs font-semibold text-emerald-700">
                            ✓ {discovered.length} alat terdeteksi
                          </p>
                          <select
                            id="select-discovered-device"
                            value={selectedDeviceId}
                            onChange={(e) =>
                              setSelectedDeviceId(e.target.value)
                            }
                            className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 transition focus:ring-2 focus:outline-none"
                          >
                            <option value="">— Pilih alat —</option>
                            {discovered.map((d) => (
                              <option key={d.deviceCode} value={d.deviceCode}>
                                {d.deviceCode} ·{" "}
                                {formatDiscoveredAge(d.timestamp)}
                              </option>
                            ))}
                          </select>

                          {selectedDeviceInfo && (
                            <motion.div
                              key={selectedDeviceId}
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="flex gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-3 py-2.5"
                            >
                              <MdOutlineDeviceHub
                                size={16}
                                className="mt-0.5 shrink-0 text-emerald-600"
                              />
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                <span className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-800">
                                    pH:
                                  </span>{" "}
                                  {selectedDeviceInfo.ph.toFixed(1)}
                                </span>
                                <span className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-800">
                                    Kelembapan:
                                  </span>{" "}
                                  {selectedDeviceInfo.moisture}%
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDiscoveredAge(
                                    selectedDeviceInfo.timestamp,
                                  )}
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </fieldset>

                  <fieldset className="overflow-hidden rounded-xl border border-black/6">
                    <legend className="sr-only">Detail Alat</legend>
                    <div className="border-b border-black/5 bg-gray-50/80 px-4 py-3">
                      <span className="text-xs font-bold text-gray-700">
                        Langkah 2 — Lengkapi Detail Alat
                      </span>
                    </div>

                    <div className="flex flex-col gap-4 p-4">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="device-label-input"
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600"
                        >
                          <MdOutlineLabel size={13} />
                          Nama / Label Alat
                        </label>
                        <input
                          id="device-label-input"
                          type="text"
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder="cth. Bayam Halaman Depan"
                          maxLength={80}
                          className="focus:border-primary focus:ring-primary/20 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 transition placeholder:text-gray-300 focus:ring-2 focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="select-plant"
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600"
                        >
                          <MdOutlineSpa size={13} />
                          Tanaman
                        </label>
                        <select
                          id="select-plant"
                          value={selectedPlantId}
                          onChange={(e) => setSelectedPlantId(e.target.value)}
                          className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 transition focus:ring-2 focus:outline-none"
                        >
                          <option value="">— Pilih tanaman —</option>
                          {plants.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        {plants.length === 0 && (
                          <p className="text-xs text-gray-400">
                            Belum ada data tanaman. Tambahkan tanaman terlebih
                            dahulu.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="select-polybag"
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600"
                        >
                          <MdOutlineWaterDrop size={13} />
                          Ukuran Polybag
                        </label>
                        <select
                          id="select-polybag"
                          value={selectedPolybagId}
                          onChange={(e) => setSelectedPolybagId(e.target.value)}
                          className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 transition focus:ring-2 focus:outline-none"
                        >
                          <option value="">— Pilih polybag —</option>
                          {polybags.map((pb) => (
                            <option key={pb.id} value={pb.id}>
                              {pb.name} | Diameter {pb.diameter}cm | Tinggi{" "}
                              {pb.height}cm | Volume Tanah {pb.soilVolumeLiter}L
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="select-interval"
                          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600"
                        >
                          <MdAccessTime size={13} className="text-amber-500" />
                          Interval Pengambilan Data (Menit)
                        </label>
                        <select
                          id="select-interval"
                          value={sensorInterval}
                          onChange={(e) =>
                            setSensorInterval(Number(e.target.value))
                          }
                          className="focus:border-primary focus:ring-primary/20 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 transition focus:ring-2 focus:outline-none"
                        >
                          <option value={1}>1 Menit</option>
                          <option value={5}>5 Menit</option>
                          <option value={10}>10 Menit</option>
                          <option value={15}>15 Menit</option>
                          <option value={30}>30 Menit</option>
                          <option value={60}>1 jam</option>
                        </select>
                        <p className="text-[10px] leading-normal text-gray-400">
                          Tentukan seberapa sering alat membaca & mengirim data
                          sensor.
                        </p>
                      </div>
                    </div>
                  </fieldset>

                  <AnimatePresence>
                    {formError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="px-1 text-xs font-medium text-rose-600"
                      >
                        ⚠ {formError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </form>
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-black/6 bg-gray-50/50 px-6 py-4">
                <button
                  type="button"
                  id="cancel-connect-btn"
                  onClick={onClose}
                  className="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="connect-device-form"
                  id="submit-connect-btn"
                  disabled={isSubmitting || scanStatus === "scanning"}
                  className="bg-primary hover:bg-primary-light flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <motion.span
                        className="block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      Menghubungkan…
                    </>
                  ) : (
                    <>
                      <MdOutlineDeviceHub size={15} />
                      Hubungkan Sekarang
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
