"use client";

import { motion } from "framer-motion";
import {
  MdCircle,
  MdOutlineDeleteOutline,
  MdOutlineEdit,
} from "react-icons/md";
import type { RegisteredDevice } from "@/types/device";

interface DeviceCardProps {
  device: RegisteredDevice;
  index: number;
  onEdit: (device: RegisteredDevice) => void;
  onDelete: (device: RegisteredDevice) => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Belum pernah aktif";
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return "Baru saja";
    if (mins < 60) return `${mins} menit lalu`;
    if (hrs < 24) return `${hrs} jam lalu`;
    return `${days} hari lalu`;
  } catch {
    return dateStr;
  }
}

export default function DeviceCard({
  device,
  index,
  onEdit,
  onDelete,
}: DeviceCardProps) {
  const isActive = device.status === "ACTIVE";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1 gap-y-1 py-2 xl:grid-cols-[minmax(0,1.8fr)_9.5rem_7.5rem_9rem_auto] xl:py-3"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 xl:contents">
        <p className="min-w-0 truncate text-xs font-bold text-neutral-900 sm:text-sm xl:text-lg">
          <MdCircle
            aria-label={isActive ? "Aktif" : "Tidak aktif"}
            size={8}
            className={`mr-2 inline-block ${isActive ? "text-green-600" : "text-red-500"}`}
          />
          {device.label}
        </p>

        <div className="hidden xl:block">
          <span
            className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-semibold ${
              isActive
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-neutral-600 bg-neutral-100 text-neutral-800"
            }`}
          >
            <MdCircle
              size={9}
              className={isActive ? "text-green-600" : "text-neutral-700"}
            />
            {isActive ? "Aktif" : "Tidak Aktif"}
          </span>
        </div>

        <div className="order-1 max-w-full min-w-0 xl:order-none">
          {device.plant ? (
            <span className="text-primary inline-block max-w-full truncate rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold sm:text-xs xl:px-3 xl:py-1 xl:text-sm">
              {device.plant.name}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
        </div>
      </div>
      <p className="max-w-16 text-right text-[10px] text-neutral-600 sm:max-w-none sm:text-xs xl:text-left xl:text-sm">
        {formatRelativeTime(device.lastSeenAt)}
      </p>

      <div className="flex items-center gap-0 xl:gap-2">
        <button
          id={`edit-device-${device.id}`}
          onClick={() => onEdit(device)}
          aria-label={`Edit ${device.label}`}
          className="border-primary-light/70 bg-primary/5 text-primary hover:bg-primary/10 flex min-h-9 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 p-1.5 text-sm font-semibold transition-colors xl:px-3.5 xl:py-2"
        >
          <MdOutlineEdit size={17} />
          <span className="hidden xl:inline">Edit</span>
        </button>
        <button
          id={`delete-device-${device.id}`}
          onClick={() => onDelete(device)}
          aria-label={`Hapus ${device.label}`}
          className="flex min-h-9 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-red-600 bg-red-50 p-1.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 xl:px-3.5 xl:py-2"
        >
          <MdOutlineDeleteOutline size={17} />
          <span className="hidden xl:inline">Hapus</span>
        </button>
      </div>
    </motion.div>
  );
}
