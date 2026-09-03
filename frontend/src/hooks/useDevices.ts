"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type {
  RegisteredDevice,
  ClaimDevicePayload,
  UpdateDevicePayload,
} from "@/types/device";
import {
  fetchDevices,
  claimDevice,
  updateDevice,
  deleteDevice,
} from "@/services/deviceService";

export function useDevices() {
  const { data: session } = useSession();
  const token = session?.user?.backendToken ?? "";

  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDevices(token);
      setDevices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar alat.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const claim = useCallback(
    async (payload: ClaimDevicePayload): Promise<RegisteredDevice> => {
      if (!token) throw new Error("Tidak ada sesi aktif.");
      const newDevice = await claimDevice(token, payload);
      setDevices((prev) => [newDevice, ...prev]);
      return newDevice;
    },
    [token]
  );

  const update = useCallback(
    async (id: string, payload: UpdateDevicePayload): Promise<void> => {
      if (!token) throw new Error("Tidak ada sesi aktif.");
      const updated = await updateDevice(token, id, payload);
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
      );
    },
    [token]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      if (!token) throw new Error("Tidak ada sesi aktif.");
      await deleteDevice(token, id);
      setDevices((prev) => prev.filter((d) => d.id !== id));
    },
    [token]
  );

  return {
    devices,
    isLoading,
    error,
    token,
    loadDevices,
    claim,
    update,
    remove,
  };
}
