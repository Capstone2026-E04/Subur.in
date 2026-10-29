"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  MdNotificationsActive,
  MdSend,
  MdCheckCircle,
  MdLinkOff,
} from "react-icons/md";
import { Card } from "@/components/ui/card";
import {
  fetchMe,
  generateTelegramLinkCode,
  disconnectTelegram,
  sendTelegramTestMessage,
} from "@/services/userService";

import DeveloperModeControl from "@/components/dashboard/DeveloperModeControl";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export default function SettingsPage() {
  const { data: session } = useSession();
  const backendToken = session?.user?.backendToken ?? "";

  const [isTelegramLinked, setIsTelegramLinked] = useState(false);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [telegramLinkCode, setTelegramLinkCode] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [isTelegramTesting, setIsTelegramTesting] = useState(false);
  const [telegramTestSent, setTelegramTestSent] = useState(false);

  const [moistureNotif, setMoistureNotif] = useState(true);
  const [phNotif, setPhNotif] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMoistureNotif(localStorage.getItem("moistureNotif") !== "false");
      setPhNotif(localStorage.getItem("phNotif") !== "false");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const updatePreferences = (moisture: boolean, ph: boolean) => {
    setMoistureNotif(moisture);
    setPhNotif(ph);
    localStorage.setItem("moistureNotif", String(moisture));
    localStorage.setItem("phNotif", String(ph));
  };

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

  const handleTestTelegram = async () => {
    if (!backendToken) return;
    setIsTelegramTesting(true);
    setTelegramTestSent(false);
    setTelegramError(null);
    try {
      await sendTelegramTestMessage(backendToken);
      setTelegramTestSent(true);
    } catch (err) {
      setTelegramError(
        err instanceof Error
          ? err.message
          : "Gagal mengirim pesan uji coba Telegram.",
      );
    } finally {
      setIsTelegramTesting(false);
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
      setTelegramTestSent(false);
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

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 pb-6 sm:space-y-6 sm:pb-12">
      <Card className="space-y-4 p-5">
        <div className="border-border flex items-center gap-3 border-b pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
            <MdSend size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-800">
              Sambungkan ke Telegram
            </h3>
            <p className="text-[10px] text-neutral-400">
              Terima notifikasi perangkat Anda langsung di Telegram.
            </p>
          </div>
        </div>

        {isTelegramLinked ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <MdCheckCircle size={18} className="shrink-0 text-emerald-500" />
              <p className="text-xs font-medium text-emerald-700 sm:text-sm">
                Terhubung ke Telegram
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTestTelegram}
                disabled={isTelegramTesting || isTelegramLoading}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-60"
              >
                <MdSend size={14} />
                {isTelegramTesting ? "Mengirim..." : "Coba Kirim"}
              </button>
              <button
                onClick={handleDisconnectTelegram}
                disabled={isTelegramLoading}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
              >
                <MdLinkOff size={14} />
                Putuskan Koneksi
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
              <p className="text-xs text-neutral-500 sm:text-sm">
                Akun Telegram Anda belum terhubung.
              </p>
              <button
                onClick={handleGenerateTelegramLinkCode}
                disabled={isTelegramLoading}
                className="bg-primary hover:bg-primary-light inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-60"
              >
                <MdSend size={14} />
                Sambungkan ke Telegram
              </button>
            </div>

            {telegramLinkCode && (
              <div className="space-y-1.5 rounded-lg border border-black/8 bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-500">
                  Buka bot{" "}
                  {TELEGRAM_BOT_USERNAME
                    ? `@${TELEGRAM_BOT_USERNAME}`
                    : "Subur.in"}{" "}
                  di Telegram, lalu kirim pesan berikut:
                </p>
                <p className="font-mono text-sm font-semibold text-neutral-800">
                  /link {telegramLinkCode}
                </p>
              </div>
            )}
          </div>
        )}

        {telegramTestSent && !telegramError && (
          <p className="text-xs font-semibold text-emerald-600">
            ✓ Pesan uji coba terkirim. Cek Telegram Anda.
          </p>
        )}

        {telegramError && (
          <p className="text-xs font-semibold text-rose-600">
            ⚠ {telegramError}
          </p>
        )}
      </Card>

      <Card className="space-y-4 p-5">
        <div className="border-border flex items-center gap-3 border-b pb-3">
          <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <MdNotificationsActive size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-800">
              Preferensi Notifikasi
            </h3>
            <p className="text-[10px] text-neutral-400">
              Atur bagaimana sistem memperingatkan Anda secara real-time.
            </p>
          </div>
        </div>

        <div className="divide-border space-y-4 divide-y">
          <div className="flex items-center justify-between gap-4 py-2">
            <div>
              <p className="text-xs font-medium text-neutral-700 sm:text-sm">
                Notifikasi Sensor Kelembapan
              </p>
              <p className="text-[10px] text-neutral-400 sm:text-xs">
                Peringatkan jika kelembapan tanaman di bawah batas aman.
              </p>
            </div>
            <label
              htmlFor="settings-moisture-notif"
              className="relative inline-flex shrink-0 cursor-pointer items-center"
            >
              <input
                id="settings-moisture-notif"
                type="checkbox"
                checked={moistureNotif}
                onChange={(e) => updatePreferences(e.target.checked, phNotif)}
                className="peer sr-only"
              />
              <div className="peer peer-checked:bg-primary h-5 w-9 rounded-full bg-neutral-200 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-xs font-medium text-neutral-700 sm:text-sm">
                Notifikasi Sensor pH
              </p>
              <p className="text-[10px] text-neutral-400 sm:text-xs">
                Peringatkan jika pH tanah terdeteksi terlalu asam atau terlalu
                basa.
              </p>
            </div>
            <label
              htmlFor="settings-ph-notif"
              className="relative inline-flex shrink-0 cursor-pointer items-center"
            >
              <input
                id="settings-ph-notif"
                type="checkbox"
                checked={phNotif}
                onChange={(e) =>
                  updatePreferences(moistureNotif, e.target.checked)
                }
                className="peer sr-only"
              />
              <div className="peer peer-checked:bg-primary h-5 w-9 rounded-full bg-neutral-200 peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>
      </Card>

      <DeveloperModeControl />
    </div>
  );
}
