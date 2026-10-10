"use client";

import { useSensorRealtime, ConnectionStatus } from "@/hooks/useSensorRealtime";
import SensorGaugeCard from "./SensorGaugeCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdOutlineWaterDrop,
  MdOutlineSpa,
  MdSignalWifiStatusbarConnectedNoInternet4,
  MdSignalWifi4Bar,
  MdSignalWifiOff,
} from "react-icons/md";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Belum ada data";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Asia/Jakarta",
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

const TONES = {
  red: {
    stroke: "#ef4444",
    glow: "#ef4444",
    text: "text-red-500",
    badge: "text-red-700",
    badgeBg: "bg-red-100",
  },
  orange: {
    stroke: "#f97316",
    glow: "#f97316",
    text: "text-orange-500",
    badge: "text-orange-700",
    badgeBg: "bg-orange-100",
  },
  amber: {
    stroke: "#d97706",
    glow: "#d97706",
    text: "text-amber-600",
    badge: "text-amber-700",
    badgeBg: "bg-amber-100",
  },
  green: {
    stroke: "#16a34a",
    glow: "#16a34a",
    text: "text-emerald-600",
    badge: "text-emerald-700",
    badgeBg: "bg-emerald-100",
  },
  sky: {
    stroke: "#0ea5e9",
    glow: "#0ea5e9",
    text: "text-sky-500",
    badge: "text-sky-700",
    badgeBg: "bg-sky-100",
  },
  violet: {
    stroke: "#7c3aed",
    glow: "#7c3aed",
    text: "text-violet-600",
    badge: "text-violet-700",
    badgeBg: "bg-violet-100",
  },
} as const;

type Tone = keyof typeof TONES;

const PH_MARGIN = 0.5;
const NMI_MARGIN = 5;
const NMI_WET_START = 90;
const NMI_WET_STOP = 95;

const DEFAULT_PH_RANGE = { min: 6, max: 7 };

function classifyPh(ph: number, range: { min: number; max: number }) {
  if (ph < range.min - PH_MARGIN)
    return { label: "Asam", tone: "orange" as Tone };
  if (ph < range.min) return { label: "Mendekati asam", tone: "amber" as Tone };
  if (ph <= range.max) return { label: "Optimal", tone: "green" as Tone };
  if (ph <= range.max + PH_MARGIN) {
    return { label: "Mendekati basa", tone: "amber" as Tone };
  }
  return { label: "Basa", tone: "violet" as Tone };
}

function classifyNmi(nmi: number, trigger: number | null) {
  if (trigger === null)
    return { label: "Tanpa parameter", tone: "sky" as Tone };
  if (nmi <= trigger - NMI_MARGIN)
    return { label: "Kering", tone: "red" as Tone };
  if (nmi < trigger + NMI_MARGIN) {
    return { label: "Mendekati kering", tone: "amber" as Tone };
  }
  if (nmi <= NMI_WET_START) return { label: "Optimal", tone: "sky" as Tone };
  if (nmi < NMI_WET_STOP) {
    return { label: "Mendekati basah", tone: "violet" as Tone };
  }
  return { label: "Basah", tone: "violet" as Tone };
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    label: string;
    dotColor: string;
    ringColor: string;
    textColor: string;
    Icon: React.ElementType;
  }
> = {
  connected: {
    label: "Terhubung",
    dotColor: "bg-emerald-500",
    ringColor: "bg-emerald-500/30",
    textColor: "text-emerald-700",
    Icon: MdSignalWifi4Bar,
  },
  connecting: {
    label: "Menghubungkan…",
    dotColor: "bg-amber-400",
    ringColor: "bg-amber-400/30",
    textColor: "text-amber-700",
    Icon: MdSignalWifiStatusbarConnectedNoInternet4,
  },
  disconnected: {
    label: "Terputus",
    dotColor: "bg-red-500",
    ringColor: "bg-red-500/30",
    textColor: "text-red-700",
    Icon: MdSignalWifiOff,
  },
};

function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-black/6 bg-white px-3 py-1.5 shadow-sm`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {status !== "disconnected" && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full ${cfg.ringColor}`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dotColor}`}
        />
      </span>
      <Icon size={14} className={cfg.textColor} />
      <span className={`text-xs font-semibold ${cfg.textColor}`}>
        {cfg.label}
      </span>
    </div>
  );
}

interface SensorMonitorPanelProps {
  deviceId?: string;
  deviceLabel?: string;
  token?: string | null;
  phRange?: { min: number; max: number };
  nmiTrigger?: number | null;
}

export default function SensorMonitorPanel({
  deviceId = "node_1",
  deviceLabel,
  token,
  phRange = DEFAULT_PH_RANGE,
  nmiTrigger = null,
}: SensorMonitorPanelProps) {
  const { ph, moisture, lastUpdated, connectionStatus } = useSensorRealtime(
    deviceId,
    token,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/60 flex-wrap py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-xl">
            <MdOutlineSpa size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-primary text-sm leading-tight font-bold">
              Monitor Sensor Real-time
            </h3>
            <p className="text-xs font-medium text-gray-400">
              Perangkat:{" "}
              <span className="font-semibold text-gray-600">
                {deviceLabel || deviceId}
              </span>
            </p>
          </div>
        </div>
        <ConnectionBadge status={connectionStatus} />
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <SensorGaugeCard
          label="Tingkat pH Tanah"
          value={ph}
          unit="pH (0–14)"
          min={0}
          max={14}
          getColor={(v) => TONES[classifyPh(v, phRange).tone]}
          getClassification={(v) => classifyPh(v, phRange).label}
          icon={<MdOutlineSpa size={18} />}
          decimals={1}
        />

        <SensorGaugeCard
          label="Kelembapan (NMI)"
          value={moisture}
          unit="NMI"
          min={0}
          max={100}
          getColor={(v) => TONES[classifyNmi(v, nmiTrigger).tone]}
          getClassification={(v) => classifyNmi(v, nmiTrigger).label}
          icon={<MdOutlineWaterDrop size={18} />}
          decimals={0}
        />
      </CardContent>

      <CardFooter className="bg-muted/40 py-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={lastUpdated ?? "empty"}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2"
          >
            {connectionStatus === "connected" && (
              <motion.span
                className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            <span className="text-xs text-gray-400">
              Pembaruan terakhir:{" "}
              <span className="font-semibold text-gray-600">
                {formatTimestamp(lastUpdated)}
              </span>
            </span>
          </motion.div>
        </AnimatePresence>
      </CardFooter>
    </Card>
  );
}
