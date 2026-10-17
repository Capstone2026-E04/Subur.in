import {
  MdArrowDownward,
  MdArrowUpward,
  MdOutlineInventory2,
  MdWarningAmber,
  MdWaterDrop,
} from "react-icons/md";
import { Card } from "@/components/ui/card";
import type { DeviceRecommendation } from "@/types/device";
import { formatTimestamp } from "./sensorStatus";

type TileVariant = "danger" | "success" | "info" | "neutral";

const TILE_STYLES: Record<TileVariant, string> = {
  danger: "border-2 border-red-500 bg-red-50 text-red-600",
  success: "border-2 border-green-500 bg-green-50 text-green-600",
  info: "border-2 border-sky-500 bg-sky-50 text-sky-600",
  neutral: "bg-neutral-200/70 text-neutral-600",
};

interface TileProps {
  variant: TileVariant;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  direction?: "up" | "down";
  value: string;
}

function TreatmentTile({
  variant,
  icon,
  title,
  subtitle,
  direction,
  value,
}: TileProps) {
  const Arrow = direction === "up" ? MdArrowUpward : MdArrowDownward;
  return (
    <div className={`rounded-2xl p-3 sm:p-4 ${TILE_STYLES[variant]}`}>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-2xl">{icon}</span>
        <div className="min-w-0 leading-tight">
          <p className="text-lg font-bold">{title}</p>
          <p className="text-xs">{subtitle}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1 text-2xl font-bold">
        {direction && <Arrow size={22} className="shrink-0" />}
        {value}
      </p>
    </div>
  );
}

interface RecommendationSummaryCardProps {
  recommendation: DeviceRecommendation | null;
  isLoading: boolean;
  updatedAt: string | null;
}

export default function RecommendationSummaryCard({
  recommendation,
  isLoading,
  updatedAt,
}: RecommendationSummaryCardProps) {
  return (
    <Card className="rounded-3xl p-6">
      <h3 className="text-xl font-bold tracking-tight text-neutral-800">
        Rekomendasi Treatment Saat ini
      </h3>

      {isLoading ? (
        <div className="flex flex-1 animate-pulse flex-col items-center justify-center py-10">
          <div className="border-primary/20 border-t-primary h-10 w-10 animate-spin rounded-full border-4" />
          <p className="mt-3 text-xs font-semibold text-gray-400">
            Mengalkulasi rekomendasi perawatan terbaik...
          </p>
        </div>
      ) : !recommendation ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <MdWarningAmber size={24} />
          </div>
          <p className="text-sm font-bold text-gray-700">
            Belum Ada Rekomendasi
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-400">
            Rekomendasi belum dapat dihitung karena belum ada telemetri sensor
            yang masuk dari perangkat ini.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-base leading-snug text-neutral-700">
            {recommendation.actionText}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {recommendation.reduceWatering ? (
              <TreatmentTile
                variant="danger"
                icon={<MdWaterDrop />}
                title="Air"
                subtitle="Kurangi Pengairan"
                direction="down"
                value="-"
              />
            ) : recommendation.waterVolumeLiter > 0 ? (
              <TreatmentTile
                variant="info"
                icon={<MdWaterDrop />}
                title="Air"
                subtitle="Tambahkan Air"
                direction="up"
                value={`${(recommendation.waterVolumeLiter * 1000).toFixed(0)} mL`}
              />
            ) : (
              <TreatmentTile
                variant="neutral"
                icon={<MdWaterDrop />}
                title="Air"
                subtitle="Tidak Perlu"
                value="-"
              />
            )}

            {recommendation.sulfurDosageGram > 0 ? (
              <TreatmentTile
                variant="success"
                icon={<MdOutlineInventory2 />}
                title="Sulfur"
                subtitle="Tambahkan Sulfur"
                direction="up"
                value={`${recommendation.sulfurDosageGram.toFixed(0)} gram`}
              />
            ) : (
              <TreatmentTile
                variant="neutral"
                icon={<MdOutlineInventory2 />}
                title="Sulfur"
                subtitle="Tidak Perlu"
                value="-"
              />
            )}

            {recommendation.limeDosageGram > 0 ? (
              <TreatmentTile
                variant="success"
                icon={<MdOutlineInventory2 />}
                title="Kapur"
                subtitle="Tambahkan Kapur"
                direction="up"
                value={`${recommendation.limeDosageGram.toFixed(0)} gram`}
              />
            ) : (
              <TreatmentTile
                variant="neutral"
                icon={<MdOutlineInventory2 />}
                title="Kapur"
                subtitle="Tidak Perlu"
                value="-"
              />
            )}
          </div>

          <p className="mt-3 text-xs text-neutral-600">
            Terakhir diperbarui:{" "}
            <span className="font-bold">{formatTimestamp(updatedAt)}</span>
          </p>
        </>
      )}
    </Card>
  );
}
