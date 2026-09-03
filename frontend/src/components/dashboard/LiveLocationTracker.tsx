"use client";

import { useState, useEffect, useRef } from "react";
import { MdMyLocation, MdPlace, MdWarningAmber } from "react-icons/md";

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
  longitude: number
): Promise<{ alamatLengkap: string; detail: NominatimAddress } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "User-Agent": "AplikasiCapstoneSuburin/1.0",
        },
      }
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

  const lastGeocodedCoords = useRef<{ latitude: number; longitude: number } | null>(null);
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
          Math.abs(latitude - lastGeocodedCoords.current.latitude) > threshold ||
          Math.abs(longitude - lastGeocodedCoords.current.longitude) > threshold;

        const isTimeElapsed = now - lastFetchTime.current > 6000;

        if (isSignificantMove && isTimeElapsed) {
          lastGeocodedCoords.current = { latitude, longitude };
          lastFetchTime.current = now;

          getAddressFromCoords(latitude, longitude)
            .then((res) => {
              if (res) {
                setAddress(res.alamatLengkap);
              } else {
                setAddress("Koordinat terdeteksi, nama alamat tidak ditemukan.");
              }
            })
            .catch(() => {
              setAddress(
                "Nama alamat tidak dapat dimuat (Batas limit API OpenStreetMap terlampaui/Koneksi bermasalah)."
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
          errorMsg = "Izin lokasi ditolak. Harap izinkan akses GPS di pengaturan browser.";
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
      }
    );

    return () => {
      console.log("Menghentikan pelacakan lokasi...");
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-xl bg-white border border-black/5 shadow-sm p-5 flex items-center gap-4 animate-pulse">
        <div className="h-11 w-11 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <MdMyLocation className="text-gray-400 animate-spin" size={20} />
        </div>
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-3 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50/70 border border-rose-100 p-5 flex items-start gap-4 hover:shadow-sm transition-all duration-300">
        <div className="h-11 w-11 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
          <MdWarningAmber size={22} />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-rose-950">Pelacakan Lokasi Gagal</span>
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
              Tidak Aktif
            </span>
          </div>
          <p className="text-xs text-rose-700/80 leading-relaxed">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-black/5 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/10 text-white">
          <MdPlace size={24} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Lokasi Kebun (Live)</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Aktif
            </span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
            {address || "Mendapatkan nama lokasi..."}
          </p>
        </div>
      </div>
    </div>
  );
}
