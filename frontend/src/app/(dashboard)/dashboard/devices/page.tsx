"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdOutlineDeviceHub, MdAdd, MdOutlineInbox } from "react-icons/md";
import { useDevices } from "@/hooks/useDevices";
import DeviceCard from "@/components/devices/DeviceCard";
import ConnectDeviceModal from "@/components/devices/ConnectDeviceModal";
import EditDeviceModal from "@/components/devices/EditDeviceModal";
import DeleteConfirmDialog from "@/components/devices/DeleteConfirmDialog";
import type { RegisteredDevice } from "@/types/device";
import { Card } from "@/components/ui/card";

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

function SkeletonRow() {
  return <div className="h-14 animate-pulse rounded-xl bg-gray-100" />;
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
    <div className="mx-auto w-full max-w-5xl">
      <Card className="rounded-3xl p-6 sm:p-8">
        <div
          data-reveal
          className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Daftar Perangkat
            </h1>
            <p className="mt-1 text-base text-neutral-800">
              Pantau status dan kelola perangkat pemantau tanaman Anda.
            </p>
          </div>
          <button
            id="open-connect-modal-btn"
            onClick={() => setIsConnectOpen(true)}
            className="bg-primary hover:bg-primary-light flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors"
          >
            <MdAdd size={18} />
            Tambah Perangkat
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
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

        <div className="mt-10">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </div>
          ) : devices.length === 0 && !error ? (
            <EmptyState onAdd={() => setIsConnectOpen(true)} />
          ) : (
            <div className="divide-y divide-neutral-200 border-b border-neutral-200">
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
            </div>
          )}
        </div>

        {!isLoading && devices.length > 0 && (
          <p className="mt-4 text-sm text-neutral-800">
            Total {devices.length} perangkat · {activeCount} aktif ·{" "}
            {devices.length - activeCount} tidak aktif
          </p>
        )}
      </Card>

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
