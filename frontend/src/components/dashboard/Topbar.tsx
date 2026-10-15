"use client";

import { usePathname } from "next/navigation";
import {
  MdAccountCircle,
  MdKeyboardArrowDown,
  MdNotifications,
} from "react-icons/md";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useDevices } from "@/hooks/useDevices";
import { fetchNotifications } from "@/services/notificationService";
import { API_URL } from "@/services/api";
import { useSelectedDeviceStore } from "@/stores/selectedDeviceStore";

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
  const { devices, token, loadDevices } = useDevices();
  const { selectedDeviceId, setSelectedDeviceId } = useSelectedDeviceStore();
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
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (devices.length > 0 && !devices.some((d) => d.id === selectedDeviceId)) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId, setSelectedDeviceId]);

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

  if (segments.length === 1 && segments[0] === "dashboard") {
    breadcrumbs[0].isLast = false;
    breadcrumbs.push({ label: "Ringkasan", href: "/dashboard", isLast: true });
  }

  return (
    <header className="flex h-18 shrink-0 items-center justify-between gap-3 border-b border-neutral-900 bg-neutral-100 px-4 sm:px-6 lg:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2.5 overflow-x-auto text-base font-medium sm:text-lg"
      >
        {breadcrumbs.map((crumb, idx) => (
          <div key={crumb.label} className="flex shrink-0 items-center gap-2.5">
            {idx > 0 && <span className="font-bold text-neutral-900">/</span>}
            {crumb.isLast ? (
              <span className="text-primary font-semibold">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="hover:text-primary text-neutral-900 transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        {devices.length > 0 && (
          <div className="relative">
            <label className="sr-only" htmlFor="topbar-device-selector">
              Pilih Alat
            </label>
            <select
              id="topbar-device-selector"
              value={selectedDeviceId ?? ""}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="focus:ring-primary/30 w-40 cursor-pointer appearance-none truncate rounded-full border border-black/5 bg-white py-2 pr-9 pl-4 text-sm font-medium text-neutral-900 shadow-sm focus:ring-2 focus:outline-none sm:w-56"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
            <MdKeyboardArrowDown
              size={22}
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-neutral-900"
            />
          </div>
        )}

        <Link
          href="/dashboard/notifications"
          aria-label="Notifikasi"
          className="hover:text-primary relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-neutral-900 transition-colors"
        >
          <MdNotifications size={26} />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} notifikasi belum dibaca`}
              className="bg-primary-light absolute top-1 right-1 h-2.5 w-2.5 rounded-full"
            />
          )}
        </Link>

        <Link
          href="/dashboard/profile"
          aria-label="Profil"
          className="flex shrink-0 items-center gap-2.5 text-neutral-900"
        >
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "Profil"}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <MdAccountCircle size={40} />
            )}
          </span>
          <span className="hidden max-w-[160px] truncate text-lg font-semibold md:block">
            {user?.name || "Pengguna"}
          </span>
        </Link>
      </div>
    </header>
  );
}
