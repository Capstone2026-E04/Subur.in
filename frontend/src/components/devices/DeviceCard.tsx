"use client";

import { motion } from "framer-motion";
import {
  MdOutlineDeviceHub,
  MdOutlineEdit,
  MdOutlineDeleteOutline,
  MdOutlineSpa,
  MdOutlineWaterDrop,
  MdAccessTime,
  MdCircle,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      className="group bg-card border-border relative flex overflow-hidden rounded-2xl border shadow-xs transition-shadow duration-300 hover:shadow-md"
    >
      <div
        className={`w-1.5 shrink-0 ${isActive ? "bg-emerald-500" : "bg-gray-200"}`}
      />

      <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
        <div className="flex min-w-0 shrink-0 items-center gap-3 md:max-w-xs">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
          >
            <MdOutlineDeviceHub size={22} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-bold text-gray-800">
              {device.label}
            </p>
            <p className="mt-1 truncate font-mono text-xs text-gray-400">
              {device.deviceCode}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <MdCircle
              size={7}
              className={
                isActive ? "animate-pulse text-emerald-500" : "text-gray-400"
              }
            />
            {isActive ? "Aktif" : "Tidak Aktif"}
          </div>

          {device.plant && (
            <div className="bg-primary/8 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5">
              <MdOutlineSpa size={13} className="text-primary shrink-0" />
              <span className="text-primary/80 max-w-[140px] truncate text-xs font-medium">
                {device.plant.name}
              </span>
            </div>
          )}
          {device.polybag && (
            <div className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5">
              <MdOutlineWaterDrop size={13} className="shrink-0 text-sky-600" />
              <span className="max-w-[140px] truncate text-xs font-medium text-sky-700">
                {(() => {
                  const pb = device.polybag;
                  const name = pb.polybagType?.name || pb.name;
                  const volume = pb.soilVolumeLiter;
                  const diameter = pb.polybagType?.diameter;
                  const height = pb.polybagType?.height;

                  const nameStr = name && name !== "undefined" ? name : "";

                  let sizeStr = "";
                  if (volume) {
                    sizeStr = `${volume}L`;
                  } else if (diameter && height) {
                    sizeStr = `${diameter}x${height} cm`;
                  } else if (pb.size && pb.size !== "undefined") {
                    sizeStr = pb.size;
                  }

                  if (nameStr && sizeStr) {
                    return `${nameStr} · ${sizeStr}`;
                  } else if (nameStr) {
                    return nameStr;
                  } else if (sizeStr) {
                    return sizeStr;
                  }
                  return "Polybag";
                })()}
              </span>
            </div>
          )}
          {device.sensorInterval !== undefined && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-200/40 bg-amber-50 px-2.5 py-1.5">
              <MdAccessTime size={13} className="shrink-0 text-amber-600" />
              <span className="truncate text-xs font-medium text-amber-700">
                Tiap {device.sensorInterval} mnt
              </span>
            </div>
          )}
        </div>

        <div className="border-border flex shrink-0 flex-col items-start justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center md:flex-col md:items-end md:justify-end md:border-t-0 md:pt-0 lg:flex-row lg:items-center">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MdAccessTime size={13} className="shrink-0" />
            <span>{formatRelativeTime(device.lastSeenAt)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id={`edit-device-${device.id}`}
              onClick={() => onEdit(device)}
              aria-label={`Edit ${device.label}`}
              className="hover:bg-primary/8 hover:text-primary flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors"
            >
              <MdOutlineEdit size={14} />
              Edit
            </button>
            <button
              id={`delete-device-${device.id}`}
              onClick={() => onDelete(device)}
              aria-label={`Hapus ${device.label}`}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <MdOutlineDeleteOutline size={14} />
              Hapus
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
