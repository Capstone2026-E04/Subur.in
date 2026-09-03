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

function PlantSkeletonCard() {
  return (
    <div className="rounded-2xl bg-white border border-black/5 p-5 shadow-sm animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3 shrink-0">
        <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
        <div className="flex flex-col gap-1.5 w-32">
          <div className="h-4 rounded bg-gray-100 w-full" />
          <div className="h-3 rounded bg-gray-100 w-2/3" />
        </div>
      </div>
      <div className="flex-1 h-8 rounded bg-gray-55 max-w-md w-full" />
      <div className="flex gap-3 shrink-0">
        <div className="h-12 w-24 rounded-xl bg-gray-50" />
        <div className="h-12 w-24 rounded-xl bg-gray-50" />
      </div>
    </div>
  );
}

export default function PlantsPage() {
  const { plants, isLoading, error, loadPlants } = usePlants();

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary">Katalog Tanaman</h2>
          <p className="text-sm text-gray-500 mt-0.5">
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
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/8 bg-white text-gray-500 hover:bg-gray-50 hover:text-primary disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
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
            className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3"
          >
            <MdOutlineInbox size={16} className="text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={loadPlants}
              className="ml-auto text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <MdOutlineSpa size={32} />
          </div>
          <div>
            <p className="text-base font-bold text-gray-700">Katalog Tanaman Kosong</p>
            <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
              Tidak ditemukan data tanaman di database. Silakan jalankan seeder database pada backend Anda.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {plants.map((plant) => (
              <motion.div
                key={plant.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative flex rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300"
              >
                {/* Left accent bar matching DeviceCard */}
                <div className="w-1.5 shrink-0 bg-primary/40 group-hover:bg-primary transition-all duration-300" />

                <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5">
                  {/* Left Section: Icon and names */}
                  <div className="flex items-center gap-3 min-w-0 md:max-w-xs shrink-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <MdOutlineSpa size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate leading-tight group-hover:text-primary transition-colors">
                        {plant.name}
                      </p>
                      {plant.scientificName && (
                        <p className="text-xs text-gray-400 italic mt-1 truncate">
                          {plant.scientificName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle Section: Description */}
                  <div className="flex-1 min-w-0">
                    {plant.description ? (
                      <p className="text-xs text-gray-500 leading-relaxed font-normal md:line-clamp-2">
                        {plant.description}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic leading-relaxed">
                        Tidak ada deskripsi untuk tanaman ini.
                      </p>
                    )}
                  </div>

                  {/* Right Section: Optimal Parameters Box */}
                  <div className="flex items-center gap-3 shrink-0 border-t md:border-t-0 border-black/5 pt-3 md:pt-0">
                    {/* Kelembapan */}
                    <div className="rounded-xl bg-sky-50 px-3 py-2 border border-sky-100 flex flex-col items-center min-w-[100px]">
                      <span className="text-[9px] font-bold text-sky-600 uppercase tracking-wider">
                        Kelembapan
                      </span>
                      <span className="text-xs font-bold text-gray-700 mt-0.5">
                        {plant.minMoisture.toFixed(0)}% - {plant.maxMoisture.toFixed(0)}%
                      </span>
                      <span className="text-[9px] text-sky-700/80 font-semibold mt-0.5">
                        Tgt: {plant.targetMoisture.toFixed(0)}%
                      </span>
                    </div>

                    {/* pH Tanah */}
                    <div className="rounded-xl bg-amber-50 px-3 py-2 border border-amber-100 flex flex-col items-center min-w-[100px]">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                        pH Tanah
                      </span>
                      <span className="text-xs font-bold text-gray-700 mt-0.5">
                        {plant.minPh.toFixed(1)} - {plant.maxPh.toFixed(1)}
                      </span>
                      <span className="text-[9px] text-amber-700/80 font-semibold mt-0.5">
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
