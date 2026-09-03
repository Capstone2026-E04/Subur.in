"use client";

import { usePathname } from "next/navigation";
import { MdPerson, MdNotifications } from "react-icons/md";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useDevices } from "@/hooks/useDevices";
import { fetchNotifications } from "@/services/notificationService";
import { API_URL } from "@/services/api";

interface TopbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  devices: "Perangkat",
  recommendations: "Rekomendasi",
  plants: "Tanaman",
  analytics: "Analitik",
  notifications: "Notifikasi",
  settings: "Pengaturan",
  profile: "Profil",
};

export default function Topbar({ user }: TopbarProps) {
  const pathname = usePathname();
  const { devices, token } = useDevices();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchNotifications(token);
      const unread = data.filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Gagal memuat jumlah notifikasi:", err);
    }
  }, [token]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Sync real-time count dari telemetri SSE
  useEffect(() => {
    if (devices.length === 0 || !token) return;

    const streams = devices.map((device) => {
      const es = new EventSource(
        `${API_URL}/api/sensors/${device.id}/stream`
      );
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.notification) {
            loadUnreadCount();
          }
        } catch (e) {
          // ignore
        }
      };
      return es;
    });

    return () => {
      streams.forEach((es) => es.close());
    };
  }, [devices, token, loadUnreadCount]);

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((segment, index) => {
    const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    return {
      label,
      href,
      isLast,
    };
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-black/5 bg-background px-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            {idx > 0 && <span className="text-gray-300">/</span>}
            {crumb.isLast ? (
              <span className="text-primary font-semibold">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="text-gray-500 hover:text-primary transition-colors">
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        {/* Greeting */}
        <span className="text-sm sm:text-md font-semibold text-gray-700">
          Halo, {user?.name || "Pengguna"}
        </span>

        {/* Notification Bell */}
        <Link
          href="/dashboard/notifications"
          aria-label="Notifikasi"
          className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-black/5 bg-white text-gray-500 hover:text-primary hover:shadow-sm hover:border-black/10 transition-all shrink-0 mr-1 cursor-pointer"
        >
          <MdNotifications size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Avatar */}
        <Link
          href="/dashboard/profile"
          aria-label="Profil"
          className="flex h-9 w-9 overflow-hidden items-center justify-center rounded-full border border-primary/10 bg-primary text-white hover:border-primary-light transition-colors shrink-0"
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || "Profil"}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <MdPerson size={18} />
          )}
        </Link>
      </div>
    </header>
  );
}
