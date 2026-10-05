"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdOutlineDeleteOutline,
  MdClose,
  MdWarningAmber,
} from "react-icons/md";
import type { RegisteredDevice } from "@/types/device";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  device: RegisteredDevice | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export default function DeleteConfirmDialog({
  isOpen,
  device,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!device) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(device.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus alat.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && device && (
        <>
          <motion.div
            key="del-backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            key="del-dialog"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl"
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-5 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
                  <MdOutlineDeleteOutline size={28} className="text-rose-500" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    Lepas Klaim Alat?
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                    Alat{" "}
                    <span className="font-semibold text-gray-700">
                      {device.label}
                    </span>{" "}
                    akan dihapus dari akun Anda. Data historis yang tersimpan
                    tidak akan terpengaruh.
                  </p>
                </div>
              </div>

              <div className="mx-6 mb-4 flex items-center gap-3 rounded-xl border border-black/5 bg-gray-50 px-4 py-3">
                <MdWarningAmber size={16} className="shrink-0 text-amber-500" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">
                    {device.deviceId}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Tindakan ini tidak dapat diurungkan.
                  </p>
                </div>
              </div>

              {error && (
                <p className="mx-6 mb-3 text-center text-xs font-medium text-rose-600">
                  ⚠ {error}
                </p>
              )}

              <div className="flex gap-3 px-6 pb-6">
                <button
                  id="cancel-delete-btn"
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="flex-1 cursor-pointer rounded-xl border border-black/8 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  id="confirm-delete-btn"
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? (
                    <>
                      <motion.span
                        className="block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      Menghapus…
                    </>
                  ) : (
                    <>
                      <MdClose size={14} />
                      Ya, Hapus
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
