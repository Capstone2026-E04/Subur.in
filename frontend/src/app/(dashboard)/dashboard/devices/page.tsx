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
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/dashboard/PageHeader";

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-border bg-card/60 flex flex-col items-center gap-5 rounded-2xl border border-dashed py-16 text-center"
    >
      <div className="bg-primary/8 text-primary flex h-16 w-16 items-center justify-center rounded-2xl">
        <MdOutlineDeviceHub size={32} />
      </div>
      <div>
        <p className="text-base font-bold text-gray-700">
          Belum Ada Alat Terdaftar
        </p>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-gray-400">
          Hubungkan perangkat ESP32 pertama Anda agar dapat memantau kondisi
          tanah secara real-time.
        </p>
      </div>
      <button
        id="add-first-device-btn"
        onClick={onAdd}
        className="bg-primary hover:bg-primary-light flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
      >
        <MdAdd size={16} />
        Hubungkan Alat Pertama
      </button>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="h-1 bg-gray-100" />
      <div className="flex animate-pulse flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-100" />
          <div className="flex flex-1 flex-col gap-1.5">
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
    </Card>
  );
}

export default function DevicesPage() {
  const {
    devices,
    isLoading,
    error,
    token,
    loadDevices,
    claim,
    update,
    remove,
  } = useDevices();

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RegisteredDevice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredDevice | null>(
    null,
  );

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const activeCount = devices.filter((d) => d.status === "ACTIVE").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Manajemen Alat"
        description={
          isLoading
            ? "Memuat daftar alat…"
            : `${devices.length} alat terdaftar · ${activeCount} aktif`
        }
      >
        <button
          id="refresh-devices-btn"
          onClick={loadDevices}
          disabled={isLoading}
          aria-label="Segarkan daftar alat"
          className="hover:text-primary flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <MdRefresh size={17} className={isLoading ? "animate-spin" : ""} />
        </button>

        <button
          id="open-connect-modal-btn"
          onClick={() => setIsConnectOpen(true)}
          className="bg-primary hover:bg-primary-light flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
        >
          <MdAdd size={17} />
          <span className="hidden sm:inline">Hubungkan Alat Baru</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </PageHeader>

      {!isLoading && devices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="divide-border border-border bg-card grid grid-cols-3 divide-x overflow-hidden rounded-2xl border shadow-xs"
        >
          {[
            {
              label: "Total Alat",
              value: devices.length,
              color: "text-primary",
            },
            { label: "Aktif", value: activeCount, color: "text-emerald-600" },
            {
              label: "Tidak Aktif",
              value: devices.length - activeCount,
              color: "text-gray-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-2 py-4"
            >
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs font-medium text-gray-400">
                {stat.label}
              </p>
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
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
          >
            <MdOutlineInbox size={16} className="shrink-0 text-rose-500" />
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={loadDevices}
              className="ml-auto cursor-pointer text-xs font-semibold text-rose-600 hover:underline"
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
        <motion.div layout className="grid grid-cols-1 gap-4">
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
