import {
  MdCheckCircleOutline,
  MdScience,
  MdSchedule,
  MdSensors,
} from "react-icons/md";
import type { PhAction, PhCorrection, PhMonitor } from "@/types/device";

const ACTION_LABEL: Record<PhAction, string> = {
  NONE: "",
  LIME: "dolomit untuk menaikkan pH",
  SULFUR: "sulfur elemental untuk menurunkan pH",
};

function monitorText(m: PhMonitor): string | null {
  switch (m.status) {
    case "MASA_REAKSI":
      return m.day != null && m.totalDays != null
        ? `Menunggu reaksi, hari ke-${m.day} dari ${m.totalDays}. Rekomendasi pH baru ditahan; pemantauan air tetap berjalan.`
        : "Menunggu reaksi koreksi pH. Pemantauan air tetap berjalan.";
    case "EVALUASI":
      return m.outcome === "LANJUT_PANTAU"
        ? "Evaluasi: pH bergerak menuju target. Lanjut pantau tanpa dosis baru."
        : "Evaluasi: pH belum bergerak cukup. Dosis ulang dihitung dari pH saat ini.";
    case "ESKALASI":
      return m.reason === "OVERSHOOT"
        ? "pH melewati target ke sisi sebaliknya. Periksa probe, kalibrasi, dan media; tidak ada dosis otomatis."
        : "pH belum membaik setelah tiga evaluasi. Periksa probe, kalibrasi, dan media; tidak ada dosis otomatis.";
    case "REKOMENDASI":
      return "pH di luar batas pada dua median harian berurutan. Catat pemberian pada formulir di bawah setelah dosis diberikan.";
    case "PANTAU":
      return "Status backend: pantau pH. Belum ada izin pemberian dosis koreksi pH dari hasil pemantauan.";
    default:
      return null;
  }
}

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
  monitor?: PhMonitor | null;
  showHint?: boolean;
}

export default function PhCorrectionStatus({
  phAction,
  correction,
  monitor,
  showHint = true,
}: Props) {
  const monitorMessage = monitor ? monitorText(monitor) : null;
  if (correction.status === "NONE" && !monitorMessage) return null;
  if (correction.status === "NONE") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-relaxed text-sky-900"
      >
        {monitorMessage}
      </div>
    );
  }

  const monitorHoldsDose = monitor != null && !monitor.allowDose;
  const style = monitorHoldsDose
    ? {
        ...STATUS_STYLE.DEFERRED,
        title:
          monitor.status === "MASA_REAKSI"
            ? "Masa reaksi koreksi pH"
            : monitor.status === "ESKALASI"
              ? "Periksa kondisi media dan sensor"
              : "Pemantauan pH berlanjut",
      }
    : STATUS_STYLE[correction.status];
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
        {monitorMessage && (
          <p className="text-xs leading-relaxed font-semibold">
            {monitorMessage}
          </p>
        )}
        {showHint && correction.status === "READY" && !monitorHoldsDose && (
          <p className="text-xs leading-relaxed opacity-80">
            Angka dosis adalah estimasi model, bukan dosis pasti. Catat koreksi
            yang benar-benar Anda lakukan pada formulir di bawah.
          </p>
        )}
      </div>
    </div>
  );
}
