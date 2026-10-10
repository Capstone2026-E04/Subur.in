import {
  MdCheckCircleOutline,
  MdScience,
  MdSchedule,
  MdSensors,
} from "react-icons/md";
import type { PhAction, PhCorrection } from "@/types/device";

const ACTION_LABEL: Record<PhAction, string> = {
  NONE: "",
  LIME: "dolomit untuk menaikkan pH",
  SULFUR: "sulfur elemental untuk menurunkan pH",
};

const STATUS_STYLE = {
  READY: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: MdCheckCircleOutline,
    iconClass: "text-emerald-600",
    title: "Koreksi pH siap dipertimbangkan",
  },
  DEFERRED: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: MdSchedule,
    iconClass: "text-amber-600",
    title: "Koreksi pH ditunda",
  },
  NEEDS_CONFIRMATION: {
    box: "border-violet-200 bg-violet-50 text-violet-900",
    icon: MdSensors,
    iconClass: "text-violet-600",
    title: "Konfirmasi pengukuran pH dahulu",
  },
} as const;

interface Props {
  phAction: PhAction;
  correction: PhCorrection;
  showHint?: boolean;
}

export default function PhCorrectionStatus({
  phAction,
  correction,
  showHint = true,
}: Props) {
  if (correction.status === "NONE") return null;

  const style = STATUS_STYLE[correction.status];
  const Icon = style.icon;
  const material = ACTION_LABEL[phAction];

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-2xl border p-4 ${style.box}`}
    >
      <Icon className={`mt-0.5 shrink-0 ${style.iconClass}`} size={22} />
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-extrabold">{style.title}</p>
        {material && (
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <MdScience size={14} aria-hidden="true" />
            Terdeteksi kebutuhan {material}.
          </p>
        )}
        {correction.reasons.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed">
            {correction.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        {showHint && correction.status === "READY" && (
          <p className="text-xs leading-relaxed opacity-80">
            Angka dosis adalah estimasi model, bukan dosis pasti. Catat koreksi
            yang benar-benar Anda lakukan pada formulir di bawah.
          </p>
        )}
      </div>
    </div>
  );
}
