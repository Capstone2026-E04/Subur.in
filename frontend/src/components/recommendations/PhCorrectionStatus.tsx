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
    box: "border-primary/20 bg-primary/5 text-primary",
    icon: MdCheckCircleOutline,
    iconClass: "text-primary-light",
    title: "Koreksi pH siap dipertimbangkan",
  },
  DEFERRED: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: MdSchedule,
    iconClass: "text-amber-600",
    title: "Koreksi pH ditunda",
  },
  NEEDS_CONFIRMATION: {
    box: "border-primary/20 bg-primary/5 text-primary",
    icon: MdSensors,
    iconClass: "text-primary-light",
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
            Angka dosis adalah estimasi model, bukan dosis pasti.
          </p>
        )}
      </div>
    </div>
  );
}
