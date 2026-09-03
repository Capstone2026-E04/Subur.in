"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdOutlineEdit,
  MdClose,
  MdOutlineSpa,
  MdOutlineWaterDrop,
  MdOutlineLabel,
  MdCircle,
  MdAccessTime,
} from "react-icons/md";
import type { RegisteredDevice, PlantOption, PolybagOption, UpdateDevicePayload, DeviceStatus } from "@/types/device";
import { fetchPlants, fetchPolybags } from "@/services/deviceService";

interface EditDeviceModalProps {
  isOpen: boolean;
  device: RegisteredDevice | null;
  token: string;
  onClose: () => void;
  onSave: (id: string, payload: UpdateDevicePayload) => Promise<void>;
}

export default function EditDeviceModal({
  isOpen,
  device,
  token,
  onClose,
  onSave,
}: EditDeviceModalProps) {
  const [label, setLabel] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState("");
  const [selectedPolybagId, setSelectedPolybagId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<DeviceStatus>("ACTIVE");
  const [sensorInterval, setSensorInterval] = useState(15);
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [polybags, setPolybags] = useState<PolybagOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevDeviceId, setPrevDeviceId] = useState<string | null>(null);

  if (device && device.id !== prevDeviceId) {
    setPrevDeviceId(device.id);
    setLabel(device.label);
    setSelectedPlantId(device.plant?.id ?? "");
    setSelectedPolybagId(device.polybag?.id ?? "");
    setSelectedStatus(device.status);
    setSensorInterval(device.sensorInterval ?? 15);
    setError(null);
  }

  useEffect(() => {
    if (!isOpen || !token) return;

    Promise.all([fetchPlants(token), fetchPolybags(token)]).then(([p, pb]) => {
      setPlants(p);
      setPolybags(pb);
    }).catch(() => {});
  }, [isOpen, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!device) return;
    if (!label.trim()) { setError("Nama alat tidak boleh kosong."); return; }
    
    const intervalNum = Number(sensorInterval);
    if (isNaN(intervalNum) || !Number.isInteger(intervalNum) || intervalNum < 1) {
      setError("Interval pengambilan data harus berupa bilangan bulat positif minimal 1 menit.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onSave(device.id, {
        label: label.trim(),
        ...(selectedPlantId && { plantId: selectedPlantId }),
        ...(selectedPolybagId && { polybagId: selectedPolybagId }),
        status: selectedStatus,
        sensorInterval: intervalNum,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && device && (
        <>
          <motion.div
            key="edit-backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="edit-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/6 bg-gray-50">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <MdOutlineEdit size={18} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-primary leading-tight">Edit Alat</h2>
                    <p className="text-xs text-gray-400 font-mono">{device.deviceId}</p>
                  </div>
                </div>
                <button
                  id="close-edit-modal"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <MdClose size={18} />
                </button>
              </div>

              <form id="edit-device-form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-label-input" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <MdOutlineLabel size={13} />
                    Nama / Label Alat
                  </label>
                  <input
                    id="edit-label-input"
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-plant-select" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <MdOutlineSpa size={13} />
                    Tanaman
                  </label>
                  <select
                    id="edit-plant-select"
                    value={selectedPlantId}
                    onChange={(e) => setSelectedPlantId(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                  >
                    <option value="">— Tidak diubah —</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-polybag-select" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <MdOutlineWaterDrop size={13} />
                    Ukuran Polybag
                  </label>
                  <select
                    id="edit-polybag-select"
                    value={selectedPolybagId}
                    onChange={(e) => setSelectedPolybagId(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                  >
                    <option value="">— Tidak diubah —</option>
                    {polybags.map((pb) => (
                      <option key={pb.id} value={pb.id}>
                        {pb.name} | Diameter {pb.diameter}cm | Tinggi {pb.height}cm | Volume Tanah {pb.soilVolumeLiter}L
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-interval-select" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <MdAccessTime size={13} className="text-amber-500" />
                    Interval Pengambilan Data
                  </label>
                  <select
                    id="edit-interval-select"
                    value={sensorInterval}
                    onChange={(e) => setSensorInterval(Number(e.target.value))}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition cursor-pointer"
                  >
                    <option value={1}>1 Menit</option>
                    <option value={5}>5 Menit</option>
                    <option value={10}>10 Menit</option>
                    <option value={15}>15 Menit</option>
                    <option value={30}>30 Menit</option>
                    <option value={60}>1 jam</option>
                  </select>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Tentukan seberapa sering alat membaca & mengirim data sensor.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                    <MdCircle size={10} className="text-emerald-500" />
                    Status Alat
                  </span>
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("ACTIVE")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                        selectedStatus === "ACTIVE"
                          ? "bg-white text-emerald-600 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <MdCircle size={8} className="text-emerald-500" />
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("INACTIVE")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all cursor-pointer ${
                        selectedStatus === "INACTIVE"
                          ? "bg-white text-gray-700 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <MdCircle size={8} className="text-gray-400" />
                      Tidak Aktif
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-rose-600 font-medium"
                    >
                      ⚠ {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </form>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-black/6 bg-gray-50/50">
                <button
                  type="button"
                  id="cancel-edit-btn"
                  onClick={onClose}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="edit-device-form"
                  id="save-edit-btn"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <motion.span
                        className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white block"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                      />
                      Menyimpan…
                    </>
                  ) : (
                    "Simpan Perubahan"
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
