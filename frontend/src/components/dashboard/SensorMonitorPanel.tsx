"use client";

import { useSensorRealtime, ConnectionStatus } from "@/hooks/useSensorRealtime";
import SensorGaugeCard from "./SensorGaugeCard";
import { motion, AnimatePresence } from "framer-motion";
import { MdOutlineWaterDrop, MdOutlineSpa, MdSignalWifiStatusbarConnectedNoInternet4, MdSignalWifi4Bar, MdSignalWifiOff } from "react-icons/md";

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

function getPhColor(ph: number) {
  if (ph < 6) {
    return {
      stroke: "#f97316",
      glow: "#f97316",
      text: "text-orange-500",
      badge: "text-orange-700",
      badgeBg: "bg-orange-100",
    };
  } else if (ph <= 7.5) {
    return {
      stroke: "#16a34a",
      glow: "#16a34a",
      text: "text-emerald-600",
      badge: "text-emerald-700",
      badgeBg: "bg-emerald-100",
    };
  } else {
    return {
      stroke: "#7c3aed",
      glow: "#7c3aed",
      text: "text-violet-600",
      badge: "text-violet-700",
      badgeBg: "bg-violet-100",
    };
  }
}

function getPhClassification(ph: number): string {
  if (ph < 4.5) return "Sangat Asam";
  if (ph < 6) return "Asam";
  if (ph <= 7) return "Netral / Ideal";
  if (ph <= 7.5) return "Sedikit Basa";
  if (ph <= 9) return "Basa";
  return "Sangat Basa";
}

// ── Moisture Color Scheme ─────────────────────────────────────────────────────

function getMoistureColor(m: number) {
  if (m < 30) {
    return {
      stroke: "#ef4444",
      glow: "#ef4444",
      text: "text-red-500",
      badge: "text-red-700",
      badgeBg: "bg-red-100",
    };
  } else if (m <= 70) {
    return {
      stroke: "#0ea5e9",
      glow: "#0ea5e9",
      text: "text-sky-500",
      badge: "text-sky-700",
      badgeBg: "bg-sky-100",
    };
  } else {
    return {
      stroke: "#2563eb",
      glow: "#2563eb",
      text: "text-blue-600",
      badge: "text-blue-700",
      badgeBg: "bg-blue-100",
    };
  }
}

function getMoistureClassification(m: number): string {
  if (m < 20) return "Sangat Kering";
  if (m < 30) return "Kering";
  if (m <= 60) return "Optimal";
  if (m <= 70) return "Lembap";
  return "Terlalu Lembap";
}

// ── Connection Status Indicator ───────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; dotColor: string; ringColor: string; textColor: string; Icon: React.ElementType }
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
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/6 bg-white shadow-sm`}>
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5">
        {status !== "disconnected" && (
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full ${cfg.ringColor}`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dotColor}`} />
      </span>
      <Icon size={14} className={cfg.textColor} />
      <span className={`text-xs font-semibold ${cfg.textColor}`}>{cfg.label}</span>
    </div>
  );
}

interface SensorMonitorPanelProps {
  deviceId?: string;
  deviceLabel?: string;
}

export default function SensorMonitorPanel({
  deviceId = "node_1",
  deviceLabel,
}: SensorMonitorPanelProps) {
  const { ph, moisture, lastUpdated, connectionStatus } =
    useSensorRealtime(deviceId);

  return (
    <div className="rounded-2xl bg-white border border-black/6 shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-black/6 bg-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <MdOutlineSpa size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary leading-tight">
              Monitor Sensor Real-time
            </h3>
            <p className="text-xs text-gray-400 font-medium">
              Perangkat: <span className="font-semibold text-gray-600">{deviceLabel || deviceId}</span>
            </p>
          </div>
        </div>
        <ConnectionBadge status={connectionStatus} />
      </div>

      {/* Gauge Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
        {/* pH Card */}
        <SensorGaugeCard
          label="Tingkat pH Tanah"
          value={ph}
          unit="pH (0–14)"
          min={0}
          max={14}
          getColor={getPhColor}
          getClassification={getPhClassification}
          icon={<MdOutlineSpa size={18} />}
          decimals={1}
        />

        {/* Moisture Card */}
        <SensorGaugeCard
          label="Kelembapan Tanah"
          value={moisture}
          unit="% Moisture"
          min={0}
          max={100}
          getColor={getMoistureColor}
          getClassification={getMoistureClassification}
          icon={<MdOutlineWaterDrop size={18} />}
          decimals={0}
        />
      </div>

      {/* Footer — Last Updated */}
      <div className="px-5 py-3 border-t border-black/5 bg-gray-50/60 flex items-center gap-2">
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
      </div>
    </div>
  );
}
