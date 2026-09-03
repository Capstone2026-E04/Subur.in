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

const iconStyles = {
  warning: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
  success: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
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

  // Muat data dari backend
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

  // Preferensi notifikasi dari settings
  const [moistureNotif, setMoistureNotif] = useState(true);
  const [phNotif, setPhNotif] = useState(true);

  // Initial load
  useEffect(() => {
    isMountedRef.current = true;
    loadDevices();
    
    setTimeout(() => {
      loadNotificationsData();
    }, 0);

    // Muat preferensi dari localStorage
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

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    const streams = devices.map((device) => {
      const es = new EventSource(
        `${API_URL}/api/sensors/${device.id}/stream`
      );
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.notification) {
            // Tampilkan notifikasi native browser jika diizinkan di preferensi
            if (typeof window !== "undefined" && "Notification" in window) {
              const browserPushNotif = localStorage.getItem("browserPushNotif") !== "false";
              const savedMoisture = localStorage.getItem("moistureNotif") !== "false";
              const savedPh = localStorage.getItem("phNotif") !== "false";

              const titleLower = payload.notification.title?.toLowerCase() || "";
              const messageLower = payload.notification.message?.toLowerCase() || "";

              let shouldShow = true;
              if (!savedMoisture) {
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
                  shouldShow = false;
                }
              }

              if (!savedPh) {
                if (
                  titleLower.includes("ph") || 
                  titleLower.includes("asam") || 
                  titleLower.includes("basa") ||
                  messageLower.includes("ph") ||
                  messageLower.includes("kapur") ||
                  messageLower.includes("dolomit") ||
                  messageLower.includes("sulfur")
                ) {
                  shouldShow = false;
                }
              }

              if (browserPushNotif && shouldShow && Notification.permission === "granted") {
                new Notification(payload.notification.title, {
                  body: payload.notification.message,
                  icon: "/favicon.ico",
                  tag: payload.notification.id,
                });
              }
            }

            loadNotificationsData();
          }
        } catch {
        }
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
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    } catch (err) {
      console.error("Gagal menandai dibaca:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Hapus notifikasi
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

  // Tes notifikasi baru
  const handleTestNotification = async () => {
    // Minta izin notifikasi browser jika belum diatur
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
    }

    if (!token || isProcessing) return;
    setIsProcessing(true);
    try {
      await createTestNotification(token);
      await loadNotificationsData();

      // Jika SSE tidak mendeteksi perangkat aktif (atau sebagai fallback), tampilkan notifikasi browser lokal secara instan
      if (devices.length === 0 && typeof window !== "undefined" && "Notification" in window) {
        const browserPushNotif = localStorage.getItem("browserPushNotif") !== "false";
        if (browserPushNotif && Notification.permission === "granted") {
          new Notification("Pengujian Sistem", {
            body: "Ini adalah notifikasi uji coba untuk memverifikasi bahwa sistem notifikasi real-time Anda berfungsi dengan baik.",
            icon: "/favicon.ico",
            tag: "test-notification",
          });
        }
      }
    } catch (err) {
      console.error("Gagal memicu notifikasi uji coba:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    const titleLower = notif.title?.toLowerCase() || "";
    const messageLower = notif.message?.toLowerCase() || "";

    // Cek filter kelembapan (moisture)
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

    // Cek filter pH
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-primary">Notifikasi</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Lihat pembaruan penting serta riwayat aktivitas sensor kebun Anda secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestNotification}
            disabled={isProcessing}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 hover:shadow-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <MdNotificationsNone size={16} />
            Tes Notifikasi
          </button>

          {filteredNotifications.some((n) => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/5 bg-white px-3.5 py-2 text-xs font-semibold text-primary hover:bg-gray-50 hover:shadow-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <MdCheck size={16} />
              Tandai Dibaca
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="rounded-2xl bg-white border border-black/5 p-8 flex flex-col items-center justify-center animate-pulse space-y-4 shadow-sm">
          <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-xs text-gray-400 font-semibold">Memuat notifikasi kebun Anda...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-black/12 rounded-3xl bg-white/60 py-20 max-w-xl mx-auto shadow-sm my-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/8 text-primary mb-6">
            <MdNotificationsNone size={40} className="text-primary/70" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Semua Terkendali!</h3>
          <p className="text-sm text-gray-500 mt-2 max-w-sm leading-relaxed">
            Belum ada notifikasi baru untuk kebun Anda. Sistem akan memberi peringatan jika kelembapan atau pH sensor terdeteksi di luar batas optimal.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-black/5 shadow-sm divide-y divide-black/5 overflow-hidden">
          {filteredNotifications.map((notif) => {
            const Icon = iconComponents[notif.type] || MdInfoOutline;
            return (
              <div
                key={notif.id}
                className={`p-5 flex items-start gap-4 hover:bg-gray-55/20 transition-all duration-200 group ${
                  !notif.isRead ? "bg-primary/[0.015]" : ""
                }`}
              >
                {/* Icon Container */}
                <div
                  className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${
                    iconStyles[notif.type] || iconStyles.info
                  }`}
                >
                  <Icon size={20} />
                </div>

                {/* Text Container */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      {notif.title}
                      {notif.device && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500">
                          {notif.device.label}
                        </span>
                      )}
                      {!notif.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-ping" />
                      )}
                    </h3>
                    <span className="text-xs text-gray-400 shrink-0">
                      {getFriendlyTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteNotif(notif.id)}
                  disabled={isProcessing}
                  title="Hapus Notifikasi"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shrink-0"
                >
                  <MdDeleteOutline size={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
