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

  useEffect(() => {
    if (devices.length === 0 || !token) return;

    const streams = devices.map((device) => {
      const es = new EventSource(`${API_URL}/api/sensors/${device.id}/stream`);
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.notification) {
            loadUnreadCount();
          }
        } catch (e) {}
      };
      return es;
    });

    return () => {
      streams.forEach((es) => es.close());
    };
  }, [devices, token, loadUnreadCount]);

  const segments = pathname.split("/").filter(Boolean);

  const breadcrumbs = segments.map((segment, index) => {
    const label =
      labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    return {
      label,
      href,
      isLast,
    };
  });

  return (
    <header className="bg-background flex h-16 items-center justify-between gap-3 border-b border-black/5 px-4 sm:px-6">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-1.5 overflow-x-auto text-xs font-medium sm:text-sm"
      >
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.href} className="flex shrink-0 items-center gap-1.5">
            {idx > 0 && <span className="text-gray-300">/</span>}
            {crumb.isLast ? (
              <span className="text-primary font-semibold">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-primary text-gray-500 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3">
        <span className="sm:text-md hidden max-w-[160px] truncate text-sm font-semibold text-gray-700 md:block">
          Halo, {user?.name || "Pengguna"}
        </span>

        <Link
          href="/dashboard/notifications"
          aria-label="Notifikasi"
          className="hover:text-primary relative mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-black/5 bg-white text-gray-500 transition-all hover:border-black/10 hover:shadow-sm"
        >
          <MdNotifications size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white">
              {unreadCount}
            </span>
          )}
        </Link>

        <Link
          href="/dashboard/profile"
          aria-label="Profil"
          className="border-primary/10 bg-primary hover:border-primary-light flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-white transition-colors"
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
