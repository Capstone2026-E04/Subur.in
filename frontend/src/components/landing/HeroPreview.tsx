"use client";

import { MdOutlineSpa, MdOutlineWaterDrop } from "react-icons/md";
import SensorGaugeCard from "@/components/dashboard/SensorGaugeCard";
import PhCorrectionStatus from "@/components/recommendations/PhCorrectionStatus";

const PH_TONE = {
  stroke: "#f97316",
  glow: "#f97316",
  text: "text-orange-500",
  badge: "text-orange-700",
  badgeBg: "bg-orange-100",
};

const NMI_TONE = {
  stroke: "#ef4444",
  glow: "#ef4444",
  text: "text-red-500",
  badge: "text-red-700",
  badgeBg: "bg-red-100",
};

export default function HeroPreview() {
  return (
    <div className="shadow-primary/10 w-full max-w-md rounded-2xl border border-black/8 bg-white p-4 shadow-xl">
      <p className="px-1 pb-3 text-xs font-semibold text-gray-600">
        Contoh data: selada, pH 5,4, NMI 50
      </p>

      <div className="grid grid-cols-2 gap-3">
        <SensorGaugeCard
          label="pH Media"
          value={5.4}
          unit="pH"
          min={0}
          max={14}
          getColor={() => PH_TONE}
          getClassification={() => "Asam"}
          icon={<MdOutlineSpa size={18} />}
          decimals={1}
        />
        <SensorGaugeCard
          label="Kelembapan (NMI)"
          value={50}
          unit="NMI"
          min={0}
          max={100}
          getColor={() => NMI_TONE}
          getClassification={() => "Kering"}
          icon={<MdOutlineWaterDrop size={18} />}
          decimals={0}
        />
      </div>

      <div className="mt-3 space-y-3">
        <PhCorrectionStatus
          phAction="LIME"
          showHint={false}
          correction={{ status: "READY", reasons: [] }}
        />
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          Siram 160 mL, dolomit 2,86 g (estimasi)
        </p>
      </div>
    </div>
  );
}
