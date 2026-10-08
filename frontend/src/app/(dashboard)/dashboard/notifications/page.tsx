"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MdCheck,
  MdWarningAmber,
  MdInfoOutline,
  MdDeleteOutline,
  MdNotificationsNone,
} from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  deleteNotification,
  createTestNotification,
} from "@/services/notificationService";
import { API_URL } from "@/services/api";
import type { NotificationItem } from "@/types/device";
import { Card } from "@/components/ui/card";

const iconStyles = {
  warning:
    "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
  success:
    "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
  info: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30",
};

const iconComponents = {
  warning: MdWarningAmber,
  success: MdCheck,
  info: MdInfoOutline,
};

function getFriendlyTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays} hari lalu`;

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function NotificationsPage() {
  const { devices, token, loadDevices } = useDevices();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const isMountedRef = useRef(true);

  const loadNotificationsData = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchNotifications(token);
      if (isMountedRef.current) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Gagal memuat notifikasi:", err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [token]);

  const [moistureNotif, setMoistureNotif] = useState(true);
  const [phNotif, setPhNotif] = useState(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadDevices();

    setTimeout(() => {
      loadNotificationsData();
    }, 0);

    if (typeof window !== "undefined") {
      const savedMoisture = localStorage.getItem("moistureNotif");
      const savedPh = localStorage.getItem("phNotif");

      setTimeout(() => {
        if (savedMoisture !== null) setMoistureNotif(savedMoisture === "true");
        if (savedPh !== null) setPhNotif(savedPh === "true");
      }, 0);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadDevices, loadNotificationsData]);

  useEffect(() => {
    if (devices.length === 0 || !token) return;

    const streams = devices.map((device) => {
      const es = new EventSource(
        `${API_URL}/api/sensors/${device.id}/stream?access_token=${encodeURIComponent(token)}`,
      );
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.notification) {
            loadNotificationsData();
          }
        } catch {}
      };
      return es;
    });

    return () => {
      streams.forEach((es) => es.close());
    };
  }, [devices, token, loadNotificationsData]);

  const handleMarkAllAsRead = async () => {
    if (!token || isProcessing) return;
    setIsProcessing(true);
    try {
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Gagal menandai dibaca:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteNotif = async (id: string) => {
    if (!token || isProcessing) return;
    setIsProcessing(true);
    try {
      await deleteNotification(token, id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Gagal menghapus notifikasi:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestNotification = async () => {
    if (!token || isProcessing) return;
    setIsProcessing(true);
    try {
      await createTestNotification(token);
      await loadNotificationsData();
    } catch (err) {
      console.error("Gagal memicu notifikasi uji coba:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    const titleLower = notif.title?.toLowerCase() || "";
    const messageLower = notif.message?.toLowerCase() || "";

    if (!moistureNotif) {
      if (
        titleLower.includes("media") ||
        titleLower.includes("kering") ||
        titleLower.includes("basah") ||
        titleLower.includes("kelembapan") ||
        messageLower.includes("kelembapan") ||
        messageLower.includes("siram") ||
        messageLower.includes("kering") ||
        messageLower.includes("basah")
      ) {
        return false;
      }
    }

    if (!phNotif) {
      if (
        titleLower.includes("ph") ||
        titleLower.includes("asam") ||
        titleLower.includes("basa") ||
        messageLower.includes("ph") ||
        messageLower.includes("kapur") ||
        messageLower.includes("dolomit") ||
        messageLower.includes("sulfur")
      ) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-primary text-xl font-black tracking-tight">
            Notifikasi
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            Lihat pembaruan penting serta riwayat aktivitas sensor kebun Anda
            secara real-time.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleTestNotification}
            disabled={isProcessing}
            className="border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-all hover:shadow-sm disabled:opacity-50"
          >
            <MdNotificationsNone size={16} />
            Tes Notifikasi
          </button>

          {filteredNotifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isProcessing}
              className="text-primary inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/5 bg-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-all hover:bg-gray-50 hover:shadow-sm disabled:opacity-50"
            >
              <MdCheck size={16} />
              Tandai Dibaca
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card className="animate-pulse items-center justify-center space-y-4 p-8">
          <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
          <p className="text-xs font-semibold text-gray-400">
            Memuat notifikasi kebun Anda...
          </p>
        </Card>
      ) : filteredNotifications.length === 0 ? (
        <Card className="mx-auto my-8 max-w-xl items-center justify-center rounded-3xl border-dashed p-8 py-20 text-center">
          <div className="bg-primary/8 text-primary mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
            <MdNotificationsNone size={40} className="text-primary/70" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Semua Terkendali!</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
            Belum ada notifikasi baru untuk kebun Anda. Sistem akan memberi
            peringatan jika kelembapan atau pH sensor terdeteksi di luar batas
            optimal.
          </p>
        </Card>
      ) : (
        <Card className="divide-border divide-y overflow-hidden">
          {filteredNotifications.map((notif) => {
            const Icon = iconComponents[notif.type] || MdInfoOutline;
            return (
              <div
                key={notif.id}
                className={`hover:bg-gray-55/20 group flex items-start gap-4 p-5 transition-all duration-200 ${
                  !notif.isRead ? "bg-primary/[0.015]" : ""
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    iconStyles[notif.type] || iconStyles.info
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
                      {notif.title}
                      {notif.device && (
                        <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-500 uppercase">
                          {notif.device.label}
                        </span>
                      )}
                      {!notif.isRead && (
                        <span className="bg-primary h-1.5 w-1.5 shrink-0 animate-ping rounded-full" />
                      )}
                    </h3>
                    <span className="shrink-0 text-xs text-gray-400">
                      {getFriendlyTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-600 sm:text-sm">
                    {notif.message}
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteNotif(notif.id)}
                  disabled={isProcessing}
                  title="Hapus Notifikasi"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 focus:opacity-100"
                >
                  <MdDeleteOutline size={18} />
                </button>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
