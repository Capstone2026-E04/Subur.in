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
      className="group relative flex rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
    >
      <div
        className={`w-1.5 shrink-0 ${isActive ? "bg-emerald-500" : "bg-gray-200"}`}
      />

      <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3 min-w-0 md:max-w-xs shrink-0">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}
          >
            <MdOutlineDeviceHub size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate leading-tight">
              {device.label}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-1 truncate">
              {device.deviceId}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div
            className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            <MdCircle size={7} className={isActive ? "text-emerald-500 animate-pulse" : "text-gray-400"} />
            {isActive ? "Aktif" : "Tidak Aktif"}
          </div>

          {device.plant && (
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-2.5 py-1.5">
              <MdOutlineSpa size={13} className="text-primary shrink-0" />
              <span className="text-xs font-medium text-primary/80 truncate max-w-[140px]">
                {device.plant.name}
              </span>
            </div>
          )}
          {device.polybag && (
            <div className="flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5">
              <MdOutlineWaterDrop size={13} className="text-sky-600 shrink-0" />
              <span className="text-xs font-medium text-sky-700 truncate max-w-[140px]">
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
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 border border-amber-200/40">
              <MdAccessTime size={13} className="text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-amber-700 truncate">
                Tiap {device.sensorInterval} mnt
              </span>
            </div>
          )}
        </div>

        {/* Right Section: Last Seen & Action Buttons */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-start sm:items-center md:items-end lg:items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-black/5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <MdAccessTime size={13} className="shrink-0" />
            <span>{formatRelativeTime(device.lastSeenAt)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id={`edit-device-${device.id}`}
              onClick={() => onEdit(device)}
              aria-label={`Edit ${device.label}`}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-primary/8 hover:text-primary transition-colors cursor-pointer"
            >
              <MdOutlineEdit size={14} />
              Edit
            </button>
            <button
              id={`delete-device-${device.id}`}
              onClick={() => onDelete(device)}
              aria-label={`Hapus ${device.label}`}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
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
