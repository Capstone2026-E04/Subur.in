"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdOutlineSpa,
  MdWaterDrop,
  MdRefresh,
  MdOutlineScience,
  MdOutlineInbox,
  MdOutlineInfo,
} from "react-icons/md";
import { usePlants } from "@/hooks/usePlants";
import { Card } from "@/components/ui/card";

function PlantSkeletonCard() {
  return (
    <Card className="animate-pulse flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
      <div className="flex shrink-0 items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-xl bg-gray-100" />
        <div className="flex w-32 flex-col gap-1.5">
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
      <div className="bg-gray-55 h-8 w-full max-w-md flex-1 rounded" />
      <div className="flex shrink-0 gap-3">
        <div className="h-12 w-24 rounded-xl bg-gray-50" />
        <div className="h-12 w-24 rounded-xl bg-gray-50" />
      </div>
    </Card>
  );
}

export default function PlantsPage() {
  const { plants, isLoading, error, loadPlants } = usePlants();

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-primary text-lg font-bold">Katalog Tanaman</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {isLoading
              ? "Memuat daftar tanaman…"
              : `${plants.length} jenis tanaman didukung di Subur.in`}
          </p>
        </div>

        <button
          id="refresh-plants-btn"
          onClick={loadPlants}
          disabled={isLoading}
          aria-label="Segarkan katalog tanaman"
          className="hover:text-primary flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <MdRefresh size={17} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

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
              onClick={loadPlants}
              className="ml-auto cursor-pointer text-xs font-semibold text-rose-600 hover:underline"
            >
              Coba Lagi
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(4)].map((_, i) => (
            <PlantSkeletonCard key={i} />
          ))}
        </div>
      ) : plants.length === 0 && !error ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-black/12 bg-white/60 py-16 text-center"
        >
          <div className="bg-primary/8 text-primary flex h-16 w-16 items-center justify-center rounded-2xl">
            <MdOutlineSpa size={32} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-700">
              Katalog Tanaman Belum Tersedia
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-gray-400">
              Data jenis tanaman belum ditambahkan ke sistem. Hubungi admin
              Subur.in untuk melengkapinya.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {plants.map((plant) => (
              <motion.div
                key={plant.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-card border-border relative flex overflow-hidden rounded-2xl border shadow-xs transition-shadow duration-300 hover:shadow-md"
              >
                <div className="bg-primary/40 group-hover:bg-primary w-1.5 shrink-0 transition-all duration-300" />

                <div className="flex flex-1 flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
                  <div className="flex min-w-0 shrink-0 items-center gap-3 md:max-w-xs">
                    <div className="bg-primary/8 text-primary group-hover:bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:text-white">
                      <MdOutlineSpa size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="group-hover:text-primary truncate text-sm leading-tight font-bold text-gray-800 transition-colors">
                        {plant.name}
                      </p>
                      {plant.scientificName && (
                        <p className="mt-1 truncate text-xs text-gray-400 italic">
                          {plant.scientificName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    {plant.description ? (
                      <p className="text-xs leading-relaxed font-normal text-gray-500 md:line-clamp-2">
                        {plant.description}
                      </p>
                    ) : (
                      <p className="text-xs leading-relaxed text-gray-400 italic">
                        Tidak ada deskripsi untuk tanaman ini.
                      </p>
                    )}
                  </div>

                  <div className="border-border flex shrink-0 items-center gap-3 border-t pt-3 md:border-t-0 md:pt-0">
                    <div className="flex min-w-[100px] flex-col items-center rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                      <span className="text-[9px] font-bold tracking-wider text-sky-600 uppercase">
                        Kelembapan (NMI)
                      </span>
                      <span className="mt-0.5 text-xs font-bold text-gray-700">
                        {plant.nmiTrigger !== null
                          ? `Trigger ${plant.nmiTrigger}`
                          : "-"}
                      </span>
                      <span className="mt-0.5 text-[9px] font-semibold text-sky-700/80">
                        Tgt: {plant.nmiTarget ?? "-"}
                      </span>
                    </div>

                    <div className="flex min-w-[100px] flex-col items-center rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                      <span className="text-[9px] font-bold tracking-wider text-amber-600 uppercase">
                        pH Tanah
                      </span>
                      <span className="mt-0.5 text-xs font-bold text-gray-700">
                        {plant.minPh.toFixed(1)} - {plant.maxPh.toFixed(1)}
                      </span>
                      <span className="mt-0.5 text-[9px] font-semibold text-amber-700/80">
                        Tgt: {plant.phTarget.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
