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
  analytics: "Analitik",
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

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? devices[0];
  const plantName = selectedDevice?.plant?.name;

  const deviceSelector = (id: string) =>
    devices.length > 0 && (
      <div className="relative min-w-0">
        <MdOutlineSpa
          size={23}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#66a449]"
        />
        <label className="sr-only" htmlFor={id}>
          Pilih perangkat
        </label>
        <select
          id={id}
          value={selectedDevice?.id ?? ""}
          onChange={(event) => setSelectedDeviceId(event.target.value)}
          className="h-11 w-full cursor-pointer appearance-none truncate rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-11 text-sm font-medium text-[#0b5038] focus:ring-2 focus:ring-emerald-100 focus:outline-none md:w-44"
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.plant?.name ?? device.label} / {device.label}
            </option>
          ))}
        </select>
        <MdKeyboardArrowDown
          size={20}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#0b5038]"
        />
      </div>
    );

  return (
    <header className="shrink-0 bg-white px-4 pt-4 pb-3 sm:px-6 md:py-5 lg:px-7">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1 md:hidden">
          <MobileNavigation role={role} />
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo/logo-suburin.svg" alt="" width={32} height={32} />
            <span className="text-xl font-bold tracking-tight text-slate-950">
              Subur.in
            </span>
          </Link>
        </div>
        <div className="hidden min-w-0 md:block">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950">
            {pathname === "/dashboard"
              ? `Halo, ${plantName ?? user?.name?.split(" ")[0] ?? "Pekebun"}`
              : breadcrumbs[breadcrumbs.length - 1]?.label}{" "}
            <MdOutlineSpa aria-hidden className="inline-block text-[#66a449]" />
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pantau kondisi tanamanmu hari ini.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden md:block">
            {deviceSelector("desktop-device-selector")}
          </div>
          <Link
            href="/dashboard/notifications"
            aria-label="Notifikasi"
            className="relative flex h-11 w-11 items-center justify-center text-slate-900"
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
            className="flex items-center gap-3 text-slate-950"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#073b2c] text-lg text-white">
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
      <div className="mt-4 md:hidden">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {pathname === "/dashboard"
            ? `Halo, ${plantName ?? user?.name?.split(" ")[0] ?? "Pekebun"}`
            : breadcrumbs[breadcrumbs.length - 1]?.label}{" "}
          <MdOutlineSpa aria-hidden className="inline-block text-[#66a449]" />
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pantau kondisi tanamanmu hari ini.
        </p>
        <div className="mt-3">{deviceSelector("mobile-device-selector")}</div>
      </div>
    </header>
  );
}
