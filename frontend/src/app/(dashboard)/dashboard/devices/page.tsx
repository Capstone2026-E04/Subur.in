"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdOutlineDeviceHub,
  MdAdd,
  MdRefresh,
  MdOutlineInbox,
} from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import DeviceCard from "@/components/devices/DeviceCard";
import ConnectDeviceModal from "@/components/devices/ConnectDeviceModal";
import EditDeviceModal from "@/components/devices/EditDeviceModal";
import DeleteConfirmDialog from "@/components/devices/DeleteConfirmDialog";
import type { RegisteredDevice } from "@/types/device";

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-black/12 bg-white/60 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
        <MdOutlineDeviceHub size={32} />
      </div>
      <div>
        <p className="text-base font-bold text-gray-700">Belum Ada Alat Terdaftar</p>
        <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
          Hubungkan perangkat ESP32 pertama Anda agar dapat memantau kondisi tanah secara real-time.
        </p>
      </div>
      <button
        id="add-first-device-btn"
        onClick={onAdd}
        className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-all shadow-sm cursor-pointer"
      >
        <MdAdd size={16} />
        Hubungkan Alat Pertama
      </button>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden">
      <div className="h-1 bg-gray-100" />
      <div className="flex flex-col gap-4 p-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-3.5 w-2/3 rounded-md bg-gray-100" />
            <div className="h-2.5 w-1/2 rounded-md bg-gray-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-24 rounded-lg bg-gray-100" />
          <div className="h-7 w-20 rounded-lg bg-gray-100" />
        </div>
        <div className="h-px bg-gray-100" />
        <div className="flex justify-between">
          <div className="h-3 w-28 rounded-md bg-gray-100" />
          <div className="flex gap-1">
            <div className="h-6 w-14 rounded-lg bg-gray-100" />
            <div className="h-6 w-14 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DevicesPage() {
  const { devices, isLoading, error, token, loadDevices, claim, update, remove } =
    useDevices();

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegisteredDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredDevice | null>(null);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const activeCount = devices.filter((d) => d.status === "ACTIVE").length;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Manajemen Alat</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading
              ? "Memuat daftar alat…"
              : `${devices.length} alat terdaftar · ${activeCount} aktif`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-devices-btn"
            onClick={loadDevices}
            disabled={isLoading}
            aria-label="Segarkan daftar alat"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 hover:bg-gray-50 hover:text-primary disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
          >
            <MdRefresh size={17} className={isLoading ? "animate-spin" : ""} />
          </button>

          <button
            id="open-connect-modal-btn"
            onClick={() => setIsConnectOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-all shadow-sm cursor-pointer"
          >
            <MdAdd size={17} />
            <span className="hidden sm:inline">Hubungkan Alat Baru</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>
      </div>

      {!isLoading && devices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 divide-x divide-black/5 rounded-2xl border border-black/6 bg-white shadow-sm overflow-hidden"
        >
          {[
            { label: "Total Alat", value: devices.length, color: "text-primary" },
            { label: "Aktif", value: activeCount, color: "text-emerald-600" },
            { label: "Tidak Aktif", value: devices.length - activeCount, color: "text-gray-400" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-4 px-2">
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3"
          >
            <MdOutlineInbox size={16} className="text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={loadDevices}
              className="ml-auto text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
            >
              Coba Lagi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : devices.length === 0 && !error ? (
        <EmptyState onAdd={() => setIsConnectOpen(true)} />
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {devices.map((device, idx) => (
              <DeviceCard
                key={device.id}
                device={device}
                index={idx}
                onEdit={(d) => setEditTarget(d)}
                onDelete={(d) => setDeleteTarget(d)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ConnectDeviceModal
        isOpen={isConnectOpen}
        token={token}
        onClose={() => setIsConnectOpen(false)}
        onSuccess={loadDevices}
        onClaim={claim}
      />

      <EditDeviceModal
        isOpen={!!editTarget}
        device={editTarget}
        token={token}
        onClose={() => setEditTarget(null)}
        onSave={update}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        device={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
