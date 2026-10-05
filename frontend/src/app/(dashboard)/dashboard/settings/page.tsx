"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useDevices } from "@/hooks/useDevices";
import {
  MdNotificationsActive,
  MdSave,
  MdAccessTime,
  MdOutlineDeviceHub,
  MdSend,
  MdCheckCircle,
  MdLinkOff,
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  fetchMe,
  generateTelegramLinkCode,
  disconnectTelegram,
} from "@/services/userService";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function SettingsPage() {
  const { data: session } = useSession();
  const backendToken = session?.user?.backendToken ?? "";

  const { devices, isLoading, loadDevices, update } = useDevices();
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [sensorInterval, setSensorInterval] = useState<number>(15);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);

  const [moistureNotif, setMoistureNotif] = useState(true);
  const [phNotif, setPhNotif] = useState(true);

  useEffect(() => {
    loadDevices();

    if (typeof window !== "undefined") {
      const savedMoisture = localStorage.getItem("moistureNotif");
      const savedPh = localStorage.getItem("phNotif");

      setTimeout(() => {
        if (savedMoisture !== null) setMoistureNotif(savedMoisture === "true");
        if (savedPh !== null) setPhNotif(savedPh === "true");
      }, 0);
    }
  }, [loadDevices]);

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setTimeout(() => {
        setSelectedDeviceId(devices[0].id);
        setSensorInterval(devices[0].sensorInterval ?? 15);
      }, 0);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (!backendToken) return;
    fetchMe(backendToken)
      .then((user) => setIsTelegramLinked(user.isTelegramLinked))
      .catch(() => {});
  }, [backendToken]);

  const handleGenerateTelegramLinkCode = async () => {
    if (!backendToken) return;
    setIsTelegramLoading(true);
    setTelegramError(null);
    try {
      const code = await generateTelegramLinkCode(backendToken);
      setTelegramLinkCode(code);
    } catch (err) {
      setTelegramError(
        err instanceof Error
          ? err.message
          : "Gagal membuat kode penghubung Telegram.",
      );
    } finally {
      setIsTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!backendToken) return;
    setIsTelegramLoading(true);
    setTelegramError(null);
    try {
      await disconnectTelegram(backendToken);
      setIsTelegramLinked(false);
      setTelegramLinkCode(null);
    } catch (err) {
      setTelegramError(
        err instanceof Error
          ? err.message
          : "Gagal memutuskan koneksi Telegram.",
      );
    } finally {
      setIsTelegramLoading(false);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    const dev = devices.find((d) => d.id === deviceId);
    if (dev) {
      setSensorInterval(dev.sensorInterval ?? 15);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      if (selectedDeviceId) {
        await update(selectedDeviceId, {
          sensorInterval: Number(sensorInterval),
        });
      }

      localStorage.setItem("moistureNotif", String(moistureNotif));
      localStorage.setItem("phNotif", String(phNotif));

      setSuccessMessage("Pengaturan dan preferensi berhasil disimpan.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memperbarui pengaturan.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Pengaturan</h2>
        <p className="mt-1 text-sm text-gray-500">
          Konfigurasi preferensi notifikasi, bahasa, dan interval telemetri
          sensor alat Subur.in Anda.
        </p>
      </div>

      <Card className="space-y-4 p-5">
        <div className="border-border flex items-center gap-3 border-b pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
            <MdAccessTime size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Interval Telemetri Perangkat
            </h3>
            <p className="text-[10px] text-gray-400">
              Tentukan durasi pengiriman data sensor dari perangkat ESP32 Anda.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex animate-pulse flex-col items-center justify-center py-6">
            <div className="border-primary/20 border-t-primary h-8 w-8 animate-spin rounded-full border-4" />
            <p className="mt-3 text-xs font-semibold text-gray-400">
              Memuat daftar perangkat Anda...
            </p>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm font-semibold text-gray-400">
              Belum ada perangkat terhubung.
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Silakan daftarkan perangkat terlebih dahulu pada menu Perangkat.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="settings-device-select"
                  className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-gray-400 uppercase"
                >
                  <MdOutlineDeviceHub size={12} />
                  Pilih Perangkat
                </label>
                <select
                  id="settings-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="focus:border-primary w-full cursor-pointer rounded-lg border border-black/8 bg-white px-3 py-2 text-xs text-gray-700 transition-all outline-none sm:text-sm"
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label} ({device.deviceCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="settings-interval-select"
                  className="flex items-center gap-1 text-[10px] font-bold tracking-wide text-gray-400 uppercase"
                >
                  <MdAccessTime size={12} />
                  Interval Pengambilan Data
                </label>
                <select
                  id="settings-interval-select"
                  value={sensorInterval}
                  onChange={(e) => setSensorInterval(Number(e.target.value))}
                  className="focus:border-primary w-full cursor-pointer rounded-lg border border-black/8 bg-white px-3 py-2 text-xs text-gray-700 transition-all outline-none sm:text-sm"
                >
                  <option value={1}>1 Menit (Real-time / Pengujian)</option>
                  <option value={5}>5 Menit (Responsif Tinggi)</option>
                  <option value={10}>10 Menit (Responsif)</option>
                  <option value={15}>15 Menit (Rekomendasi / Default)</option>
                  <option value={30}>30 Menit (Optimal Hemat Daya)</option>
                  <option value={60}>60 Menit (1 Jam)</option>
                  <option value={120}>120 Menit (2 Jam)</option>
                  <option value={240}>240 Menit (4 Jam)</option>
                  <option value={480}>480 Menit (8 Jam)</option>
                  <option value={720}>720 Menit (12 Jam)</option>
                  <option value={1440}>1440 Menit (24 Jam)</option>
                </select>
              </div>
            </div>

            <AnimatePresence>
              {successMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-emerald-600"
                >
                  ✓ {successMessage}
                </motion.p>
              )}
              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-rose-600"
                >
                  ⚠ {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="border-border flex items-center gap-3 border-b pb-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <MdNotificationsActive size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Preferensi Notifikasi
            </h3>
            <p className="text-[10px] text-gray-400">
              Atur bagaimana sistem memperingatkan Anda secara real-time.
            </p>
          </div>
        </div>

        <div className="divide-border space-y-4 divide-y">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="text-xs font-medium text-gray-700 sm:text-sm">
                Notifikasi Sensor Kelembapan
              </p>
              <p className="text-[10px] text-gray-400 sm:text-xs">
                Peringatkan jika kelembapan tanaman di bawah batas aman.
              </p>
            </div>
            <label
              htmlFor="settings-moisture-notif"
              className="relative inline-flex cursor-pointer items-center"
            >
              <input
                id="settings-moisture-notif"
                type="checkbox"
                checked={moistureNotif}
                onChange={(e) => setMoistureNotif(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer peer-checked:bg-primary h-5 w-9 rounded-full bg-gray-200 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-xs font-medium text-gray-700 sm:text-sm">
                Notifikasi Sensor pH
              </p>
              <p className="text-[10px] text-gray-400 sm:text-xs">
                Peringatkan jika pH tanah terdeteksi terlalu asam atau terlalu
                basa.
              </p>
            </div>
            <label
              htmlFor="settings-ph-notif"
              className="relative inline-flex cursor-pointer items-center"
            >
              <input
                id="settings-ph-notif"
                type="checkbox"
                checked={phNotif}
                onChange={(e) => setPhNotif(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer peer-checked:bg-primary h-5 w-9 rounded-full bg-gray-200 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="border-border flex items-center gap-3 border-b pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
            <MdSend size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Hubungkan Telegram
            </h3>
            <p className="text-[10px] text-gray-400">
              Terima notifikasi perangkat Anda langsung di Telegram.
            </p>
          </div>
        </div>

        {isTelegramLinked ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <MdCheckCircle size={18} className="shrink-0 text-emerald-500" />
              <p className="text-xs font-medium text-emerald-700 sm:text-sm">
                Terhubung ke Telegram
              </p>
            </div>
            <button
              onClick={handleDisconnectTelegram}
              disabled={isTelegramLoading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
            >
              <MdLinkOff size={14} />
              Putuskan Koneksi
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-500 sm:text-sm">
                Akun Telegram Anda belum terhubung.
              </p>
              <button
                onClick={handleGenerateTelegramLinkCode}
                disabled={isTelegramLoading}
                className="bg-primary hover:bg-primary-light inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
              >
                <MdSend size={14} />
                Hubungkan Telegram
              </button>
            </div>

            {telegramLinkCode && (
              <div className="space-y-1.5 rounded-lg border border-black/8 bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-500">
                  Buka bot{" "}
                  {TELEGRAM_BOT_USERNAME
                    ? `@${TELEGRAM_BOT_USERNAME}`
                    : "Subur.in"}{" "}
                  di Telegram, lalu kirim pesan berikut:
                </p>
                <p className="font-mono text-sm font-semibold text-gray-800">
                  /link {telegramLinkCode}
                </p>
              </div>
            )}
          </div>
        )}

        {telegramError && (
          <p className="text-xs font-semibold text-rose-600">
            ⚠ {telegramError}
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary hover:bg-primary-light shadow-primary/10 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <motion.span
                className="block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
              />
              Menyimpan…
            </>
          ) : (
            <>
              <MdSave size={18} />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
