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
      className="grid grid-cols-2 items-center gap-x-4 gap-y-3 py-4 md:grid-cols-[minmax(0,1.8fr)_9.5rem_7.5rem_9rem_auto]"
    >
      <p className="col-span-2 truncate text-lg font-bold text-neutral-900 md:col-span-1">
        {device.label}
      </p>

      <div>
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

      <div>
        {device.plant ? (
          <span className="text-primary inline-block max-w-full truncate rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold">
            {device.plant.name}
          </span>
        ) : (
          <span className="text-neutral-400">—</span>
        )}
      </div>

      <p className="text-sm text-neutral-600">
        {formatRelativeTime(device.lastSeenAt)}
      </p>

      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
        <button
          id={`edit-device-${device.id}`}
          onClick={() => onEdit(device)}
          aria-label={`Edit ${device.label}`}
          className="border-primary-light/70 bg-primary/5 text-primary hover:bg-primary/10 flex cursor-pointer items-center gap-1.5 rounded-xl border-2 px-3.5 py-2 text-sm font-semibold transition-colors"
        >
          <MdOutlineEdit size={17} />
          Edit
        </button>
        <button
          id={`delete-device-${device.id}`}
          onClick={() => onDelete(device)}
          aria-label={`Hapus ${device.label}`}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-red-600 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
        >
          <MdOutlineDeleteOutline size={17} />
          Hapus
        </button>
      </div>
    </motion.div>
  );
}
