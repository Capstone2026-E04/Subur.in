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
  const [browserPushNotif, setBrowserPushNotif] = useState(true);

  useEffect(() => {
    loadDevices();

    if (typeof window !== "undefined") {
      const savedMoisture = localStorage.getItem("moistureNotif");
      const savedPh = localStorage.getItem("phNotif");
      const savedBrowser = localStorage.getItem("browserPushNotif");

      setTimeout(() => {
        if (savedMoisture !== null) setMoistureNotif(savedMoisture === "true");
        if (savedPh !== null) setPhNotif(savedPh === "true");
        if (savedBrowser !== null) setBrowserPushNotif(savedBrowser === "true");
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
        err instanceof Error ? err.message : "Gagal membuat kode penghubung Telegram."
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
        err instanceof Error ? err.message : "Gagal memutuskan koneksi Telegram."
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
      localStorage.setItem("browserPushNotif", String(browserPushNotif));

      setSuccessMessage("Pengaturan dan preferensi berhasil disimpan.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memperbarui pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Pengaturan</h2>
        <p className="text-sm text-gray-500 mt-1">
          Konfigurasi preferensi notifikasi, bahasa, dan interval telemetri sensor alat Subur.in Anda.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <MdAccessTime size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Interval Telemetri Perangkat</h3>
            <p className="text-[10px] text-gray-400">Tentukan durasi pengiriman data sensor dari perangkat ESP32 Anda.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-6 flex flex-col items-center justify-center animate-pulse">
            <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-xs text-gray-400 mt-3 font-semibold">Memuat daftar perangkat Anda...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-400 font-semibold">Belum ada perangkat terhubung.</p>
            <p className="text-xs text-gray-400 mt-1">Silakan daftarkan perangkat terlebih dahulu pada menu Perangkat.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="settings-device-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <MdOutlineDeviceHub size={12} />
                  Pilih Perangkat
                </label>
                <select
                  id="settings-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-lg border border-black/8 bg-white px-3 py-2 text-gray-700 outline-none focus:border-primary transition-all cursor-pointer"
                >
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.label} ({device.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings-interval-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                  <MdAccessTime size={12} />
                  Interval Pengambilan Data
                </label>
                <select
                  id="settings-interval-select"
                  value={sensorInterval}
                  onChange={(e) => setSensorInterval(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm rounded-lg border border-black/8 bg-white px-3 py-2 text-gray-700 outline-none focus:border-primary transition-all cursor-pointer"
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
                  className="text-xs text-emerald-600 font-semibold"
                >
                  ✓ {successMessage}
                </motion.p>
              )}
              {errorMessage && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-rose-600 font-semibold"
                >
                  ⚠ {errorMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MdNotificationsActive size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Preferensi Notifikasi</h3>
            <p className="text-[10px] text-gray-400">Atur bagaimana sistem memperingatkan Anda secara real-time.</p>
          </div>
        </div>

        <div className="space-y-4 divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700">Notifikasi Sensor Kelembapan</p>
              <p className="text-[10px] sm:text-xs text-gray-400">Peringatkan jika kelembapan tanaman di bawah batas aman.</p>
            </div>
            <label htmlFor="settings-moisture-notif" className="relative inline-flex items-center cursor-pointer">
              <input
                id="settings-moisture-notif"
                type="checkbox"
                checked={moistureNotif}
                onChange={(e) => setMoistureNotif(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 pb-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700">Notifikasi Sensor pH</p>
              <p className="text-[10px] sm:text-xs text-gray-400">Peringatkan jika pH tanah terdeteksi terlalu asam atau terlalu basa.</p>
            </div>
            <label htmlFor="settings-ph-notif" className="relative inline-flex items-center cursor-pointer">
              <input
                id="settings-ph-notif"
                type="checkbox"
                checked={phNotif}
                onChange={(e) => setPhNotif(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-700">Notifikasi Push Browser (Desktop)</p>
              <p className="text-[10px] sm:text-xs text-gray-400">Tampilkan notifikasi melayang di layar sistem operasi Anda.</p>
            </div>
            <label htmlFor="settings-browser-notif" className="relative inline-flex items-center cursor-pointer">
              <input
                id="settings-browser-notif"
                type="checkbox"
                checked={browserPushNotif}
                onChange={(e) => setBrowserPushNotif(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
            <MdSend size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Hubungkan Telegram</h3>
            <p className="text-[10px] text-gray-400">Terima notifikasi perangkat Anda langsung di Telegram.</p>
          </div>
        </div>

        {isTelegramLinked ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <MdCheckCircle size={18} className="text-emerald-500 shrink-0" />
              <p className="text-xs sm:text-sm font-medium text-emerald-700">Terhubung ke Telegram</p>
            </div>
            <button
              onClick={handleDisconnectTelegram}
              disabled={isTelegramLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 transition-colors cursor-pointer"
            >
              <MdLinkOff size={14} />
              Putuskan Koneksi
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs sm:text-sm text-gray-500">Akun Telegram Anda belum terhubung.</p>
              <button
                onClick={handleGenerateTelegramLinkCode}
                disabled={isTelegramLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60 transition-colors cursor-pointer"
              >
                <MdSend size={14} />
                Hubungkan Telegram
              </button>
            </div>

            {telegramLinkCode && (
              <div className="rounded-lg border border-black/8 bg-gray-50 px-4 py-3 space-y-1.5">
                <p className="text-xs text-gray-500">
                  Buka bot {TELEGRAM_BOT_USERNAME ? `@${TELEGRAM_BOT_USERNAME}` : "Subur.in"} di Telegram, lalu kirim pesan berikut:
                </p>
                <p className="text-sm font-mono font-semibold text-gray-800">/link {telegramLinkCode}</p>
              </div>
            )}
          </div>
        )}

        {telegramError && (
          <p className="text-xs text-rose-600 font-semibold">⚠ {telegramError}</p>
        )}
      </Card>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm shadow-primary/10 cursor-pointer"
        >
          {isSaving ? (
            <>
              <motion.span
                className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white block"
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
