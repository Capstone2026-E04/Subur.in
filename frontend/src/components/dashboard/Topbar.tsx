"use client";

import Image from "next/image";
import { MdOutlineSpa } from "react-icons/md";
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
import MobileNavigation from "./MobileNavigation";

interface TopbarProps {
  role?: string;
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
  analytics: "Riwayat",
  notifications: "Notifikasi",
  settings: "Pengaturan",
  profile: "Profil",
  superadmin: "Superadmin",
};

export default function Topbar({ user, role }: TopbarProps) {
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
        } catch {}
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

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? devices[0];
  const plantName = selectedDevice?.plant?.name;

  const deviceSelector = (id: string) => (
    <div className="relative min-w-0">
      <MdOutlineSpa
        size={23}
        className="text-primary-light pointer-events-none absolute top-1/2 left-3 hidden -translate-y-1/2 md:block"
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute top-1/2 left-3 h-2 w-2 -translate-y-1/2 rounded-full md:hidden ${selectedDevice?.status === "ACTIVE" ? "bg-green-600" : "bg-red-500"}`}
      />
      <label className="sr-only" htmlFor={id}>
        Pilih perangkat
      </label>
      <select
        id={id}
        disabled={devices.length === 0}
        value={selectedDevice?.id ?? ""}
        onChange={(event) => setSelectedDeviceId(event.target.value)}
        className="text-primary focus:ring-primary/10 h-9 w-full cursor-pointer appearance-none truncate rounded-full border border-neutral-200 bg-white py-2 pr-8 pl-7 text-xs font-medium focus:ring-2 focus:outline-none md:h-11 md:w-44 md:rounded-xl md:pl-11 md:text-sm"
      >
        {devices.length === 0 && <option value="">Belum ada perangkat</option>}
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {id === "mobile-device-selector"
              ? device.label
              : `${device.plant?.name ?? device.label} / ${device.label}`}
          </option>
        ))}
      </select>
      <MdKeyboardArrowDown
        size={20}
        className="text-primary pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
      />
    </div>
  );

  return (
    <header className="z-20 shrink-0 border-b border-neutral-200 bg-white px-4 py-2 sm:px-6 md:py-5 lg:px-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
          <Link href="/dashboard" aria-label="Ringkasan" className="shrink-0">
            <Image
              src="/logo/logo-suburin.svg"
              alt="Subur.in"
              width={32}
              height={32}
            />
          </Link>
          <div className="w-44 max-w-44 min-w-0 flex-1">
            {deviceSelector("mobile-device-selector")}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <Link
              href="/dashboard/notifications"
              aria-label={
                unreadCount > 0
                  ? `Notifikasi, ${unreadCount} belum dibaca`
                  : "Notifikasi"
              }
              aria-current={
                pathname === "/dashboard/notifications" ? "page" : undefined
              }
              className="hover:bg-primary/5 relative flex h-11 w-11 items-center justify-center rounded-xl text-neutral-900 transition-colors"
            >
              <MdNotifications size={24} aria-hidden />
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"
                />
              )}
            </Link>
            <MobileNavigation role={role} />
          </div>
        </div>
        <div className="hidden min-w-0 md:block">
          <h1 className="truncate text-2xl font-bold tracking-tight text-neutral-900">
            {pathname === "/dashboard"
              ? `Halo, ${plantName ?? user?.name?.split(" ")[0] ?? "Pekebun"}`
              : breadcrumbs[breadcrumbs.length - 1]?.label}{" "}
            <MdOutlineSpa
              aria-hidden
              className="text-primary-light inline-block"
            />
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Pantau kondisi tanamanmu hari ini.
          </p>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:gap-4 md:flex">
          <div className="hidden md:block">
            {deviceSelector("desktop-device-selector")}
          </div>
          <Link
            href="/dashboard/notifications"
            aria-label="Notifikasi"
            className="relative flex h-11 w-11 items-center justify-center text-neutral-900"
          >
            <MdNotifications size={27} />
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} notifikasi belum dibaca`}
                className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500"
              />
            )}
          </Link>
          <Link
            href="/dashboard/profile"
            aria-label="Profil"
            className="flex items-center gap-3 text-neutral-900"
          >
            <span className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-lg text-white">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name || "Profil"}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                <MdAccountCircle size={32} />
              )}
            </span>
            <span className="hidden max-w-36 truncate text-sm font-medium xl:block">
              {user?.name || "Pengguna"}
            </span>
            <MdKeyboardArrowDown size={18} className="hidden xl:block" />
          </Link>
        </div>
      </div>
    </header>
  );
}
