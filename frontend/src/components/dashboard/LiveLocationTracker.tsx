"use client";

import { useState, useEffect, useRef } from "react";
import { MdMyLocation, MdPlace, MdWarningAmber } from "react-icons/md";
import { Card } from "@/components/ui/card";

interface NominatimAddress {
  road?: string;
  suburb?: string;
  village?: string;
  city_district?: string;
  city?: string;
  town?: string;
  [key: string]: unknown;
}

interface NominatimResponse {
  address?: NominatimAddress;
  display_name?: string;
}

async function getAddressFromCoords(
  latitude: number,
  longitude: number,
): Promise<{ alamatLengkap: string; detail: NominatimAddress } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "User-Agent": "AplikasiCapstoneSuburin/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    if (data.address) {
      const alamatLengkap = data.display_name || "";

      return {
        alamatLengkap,
        detail: data.address,
      };
    }
    return null;
  } catch (error) {
    console.warn("Geocoding Nominatim sedang sibuk atau dibatasi oleh server.");
    throw error;
  }
}

export default function LiveLocationTracker() {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const lastGeocodedCoords = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const lastFetchTime = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      const timer = setTimeout(() => {
        setError("Geolokasi tidak didukung oleh browser Anda.");
        setIsLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    console.log("Memulai pelacakan lokasi secara live...");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setError(null);

        const threshold = 0.0001;
        const now = Date.now();

        const isSignificantMove =
          !lastGeocodedCoords.current ||
          Math.abs(latitude - lastGeocodedCoords.current.latitude) >
            threshold ||
          Math.abs(longitude - lastGeocodedCoords.current.longitude) >
            threshold;

        const isTimeElapsed = now - lastFetchTime.current > 6000;

        if (isSignificantMove && isTimeElapsed) {
          lastGeocodedCoords.current = { latitude, longitude };
          lastFetchTime.current = now;

          getAddressFromCoords(latitude, longitude)
            .then((res) => {
              if (res) {
                setAddress(res.alamatLengkap);
              } else {
                setAddress(
                  "Koordinat terdeteksi, nama alamat tidak ditemukan.",
                );
              }
            })
            .catch(() => {
              setAddress(
                "Nama alamat tidak dapat dimuat (Batas limit API OpenStreetMap terlampaui/Koneksi bermasalah).",
              );
            })
            .finally(() => {
              setIsLoading(false);
            });
        } else {
          setIsLoading(false);
        }
      },
      (err) => {
        console.warn("Gagal mengambil lokasi:", err.message);
        let errorMsg = "Gagal mengakses sensor GPS.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg =
            "Izin lokasi ditolak. Harap izinkan akses GPS di pengaturan browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = "Informasi lokasi tidak tersedia saat ini.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Waktu tunggu pencarian lokasi habis.";
        }
        setError(errorMsg);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 10000,
      },
    );

    return () => {
      console.log("Menghentikan pelacakan lokasi...");
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="animate-pulse flex-row items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <MdMyLocation className="animate-spin text-gray-400" size={20} />
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="h-4 w-1/4 rounded bg-gray-200"></div>
          <div className="h-3 w-3/4 rounded bg-gray-100"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="flex-row items-start gap-4 border-rose-100 bg-rose-50/70 p-5 transition-all duration-300 hover:shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
          <MdWarningAmber size={22} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-rose-950">
              Pelacakan Lokasi Gagal
            </span>
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              Tidak Aktif
            </span>
          </div>
          <p className="text-xs leading-relaxed text-rose-700/80">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex-col justify-between gap-4 p-5 transition-all duration-300 hover:shadow-md md:flex-row md:items-center">
      <div className="flex items-start gap-4">
        <div className="bg-primary shadow-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-md">
          <MdPlace size={24} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">
              Lokasi Kebun (Live)
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </span>
              Aktif
            </span>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-gray-600">
            {address || "Mendapatkan nama lokasi..."}
          </p>
        </div>
      </div>
    </Card>
  );
}
