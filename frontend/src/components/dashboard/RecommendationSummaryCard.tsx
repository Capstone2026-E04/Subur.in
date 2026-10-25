import Image from "next/image";
import Link from "next/link";
import {
  MdChevronRight,
  MdOutlineSpa,
  MdTerrain,
  MdWaterDrop,
} from "react-icons/md";
import { Card } from "@/components/ui/card";
import type { DeviceRecommendation } from "@/types/device";
import { formatTimestamp } from "./sensorStatus";

interface RecommendationSummaryCardProps {
  recommendation: DeviceRecommendation | null;
  isLoading: boolean;
  updatedAt: string | null;
  message?: string;
  error?: string | null;
}

export default function RecommendationSummaryCard({
  recommendation,
  isLoading,
  updatedAt,
  message,
  error,
}: RecommendationSummaryCardProps) {
  const treatments = recommendation
    ? [
        {
          title: recommendation.reduceWatering ? "Kurangi air" : "Tambah air",
          value: recommendation.reduceWatering
            ? "Hentikan sementara"
            : `${Math.round(recommendation.waterVolumeLiter * 1000)} mL`,
          active:
            recommendation.reduceWatering ||
            recommendation.waterVolumeLiter > 0,
          water: true,
        },
        {
          title: "Tambah kapur",
          value: `${recommendation.limeDosageGram.toLocaleString("id-ID", { maximumFractionDigits: 1 })} g`,
          active: recommendation.limeDosageGram > 0,
          water: false,
        },
        {
          title: "Tambah sulfur",
          value: `${recommendation.sulfurDosageGram.toLocaleString("id-ID", { maximumFractionDigits: 1 })} g`,
          active: recommendation.sulfurDosageGram > 0,
          water: false,
        },
      ].filter((item) => item.active)
    : [];
  const actions = treatments.map((item) => item.title.toLowerCase());
  const isOptimal =
    recommendation?.categoryCode === "C1" &&
    recommendation.waterAction === "NONE" &&
    recommendation.phAction === "NONE" &&
    recommendation.phCorrection.status === "NONE" &&
    recommendation.decisionSource !== "safety_override" &&
    treatments.length === 0;
  const title = isOptimal
    ? "Kondisi tanaman sudah optimal"
    : actions.length > 0
      ? actions.join(" dan ").replace(/^./, (letter) => letter.toUpperCase())
      : "Status pemantauan tanaman";

  return (
    <Card className="relative isolate overflow-hidden rounded-2xl border-0 bg-[#edf4ed] p-4 shadow-none sm:rounded-3xl sm:p-8 lg:p-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-24 -z-10 h-96 w-96 rounded-full bg-[#dcebd9]/60"
      />
      <Image
        src="/illustrations/dashboard-plant.svg"
        alt=""
        width={440}
        height={440}
        className="pointer-events-none absolute right-0 bottom-0 -z-10 h-full w-40 object-contain object-bottom opacity-10 lg:w-[38%] lg:opacity-95"
      />
      <div>
        <p className="text-primary flex items-center gap-2 text-[10px] font-bold tracking-[0.16em] sm:text-xs sm:tracking-[0.2em]">
          <MdOutlineSpa size={18} /> REKOMENDASI HARI INI
        </p>
        {isLoading ? (
          <div role="status" className="animate-pulse py-8">
            <div className="bg-primary/10 h-8 w-3/4 rounded-lg" />
            <p className="mt-4 text-sm text-neutral-500">
              Mengalkulasi rekomendasi perawatan...
            </p>
          </div>
        ) : !recommendation ? (
          <div className="py-6">
            <h2 className="text-xl font-bold text-neutral-900 sm:text-3xl">
              {error ? "Gagal memuat rekomendasi" : "Belum ada rekomendasi"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600">
              {error ||
                message ||
                "Rekomendasi belum tersedia untuk perangkat ini."}
            </p>
          </div>
        ) : (
          <>
            <h2 className="mt-3 max-w-xl text-xl leading-tight font-bold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 sm:text-base">
              {recommendation.actionText}
            </p>
            {treatments.length > 0 ? (
              <div className="mt-5 grid gap-px overflow-hidden rounded-2xl bg-neutral-100 sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:bg-transparent">
                {treatments.map((item) => (
                  <Link
                    key={item.title}
                    scroll={false}
                    href={
                      item.water
                        ? "/dashboard/recommendations#panduan-air"
                        : "/dashboard/recommendations#panduan-ph"
                    }
                    className={`flex min-w-0 items-center gap-3 bg-white/95 p-3 transition-shadow hover:shadow-md sm:rounded-2xl sm:p-4 ${item.water ? "sm:col-start-1" : "sm:col-start-2"}`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${item.water ? "bg-sky-100 text-sky-500" : "bg-[#f4eee5] text-[#826040]"}`}
                    >
                      {item.water ? (
                        <MdWaterDrop size={29} />
                      ) : (
                        <MdTerrain size={29} />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:block">
                      <p className="text-xs text-neutral-600 sm:text-sm">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-base font-bold text-neutral-900 tabular-nums sm:text-2xl">
                        {item.value}
                      </p>
                    </div>
                    <MdChevronRight
                      size={22}
                      className="shrink-0 text-neutral-700"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-primary mt-5 text-sm font-medium">
                {isOptimal
                  ? "Belum diperlukan treatment tambahan. Lanjutkan pemantauan kondisi tanaman."
                  : "Tidak ada dosis tambahan pada respons ini. Periksa status pemantauan sebelum melakukan treatment."}
              </p>
            )}
            <p className="mt-4 text-[10px] text-neutral-500 sm:text-xs">
              Diperbarui {formatTimestamp(updatedAt)}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
