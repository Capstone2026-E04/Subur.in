"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Plant } from "@/types/device";
import { fetchPlants } from "@/services/deviceService";

export function usePlants() {
  const { data: session } = useSession();
  const token = session?.user?.backendToken ?? "";

  const [plants, setPlants] = useState<Plant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlants = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPlants(token);
      setPlants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat daftar tanaman.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  return {
    plants,
    isLoading,
    error,
    token,
    loadPlants,
  };
}
