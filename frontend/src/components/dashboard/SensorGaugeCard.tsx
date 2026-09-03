"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface SensorGaugeCardProps {
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  getColor: (value: number) => { stroke: string; glow: string; text: string; badge: string; badgeBg: string };
  getClassification: (value: number) => string;
  icon: React.ReactNode;
  decimals?: number;
}

function AnimatedNumber({
  value,
  decimals = 1,
}: {
  value: number;
  decimals?: number;
}) {
  const spring = useSpring(value, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ARC_RATIO = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_RATIO;

function CircularGauge({
  pct,
  strokeColor,
  glowColor,
}: {
  pct: number;
  strokeColor: string;
  glowColor: string;
}) {
  const fill = ARC_LENGTH * Math.min(Math.max(pct, 0), 1);
  const gap = ARC_LENGTH - fill;

  return (
    <svg
      width={140}
      height={140}
      viewBox="0 0 140 140"
      className="overflow-visible"
    >
      <defs>
        <filter id={`glow-${glowColor.replace("#", "")}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background track */}
      <circle
        cx={70}
        cy={70}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth={10}
        strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        className="text-black/8"
        transform="rotate(135 70 70)"
      />

      {/* Animated fill arc */}
      <motion.circle
        cx={70}
        cy={70}
        r={RADIUS}
        fill="none"
        stroke={strokeColor}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${fill} ${gap + (CIRCUMFERENCE - ARC_LENGTH)}`}
        strokeDashoffset={0}
        transform="rotate(135 70 70)"
        filter={`url(#glow-${glowColor.replace("#", "")})`}
        animate={{ strokeDasharray: `${fill} ${gap + (CIRCUMFERENCE - ARC_LENGTH)}` }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
      />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SensorGaugeCard({
  label,
  value,
  unit,
  min,
  max,
  getColor,
  getClassification,
  icon,
  decimals = 1,
}: SensorGaugeCardProps) {
  const pct = value !== null ? (value - min) / (max - min) : 0;
  const colors = value !== null
    ? getColor(value)
    : { stroke: "#d1d5db", glow: "#d1d5db", text: "text-gray-400", badge: "text-gray-500", badgeBg: "bg-gray-100" };

  const classification = value !== null ? getClassification(value) : "—";
  const displayValue = value !== null ? value : 0;

  // Track previous value for flash animation
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  if (prevValue !== value) {
    setPrevValue(value);
    if (prevValue !== null && value !== null) {
      setFlashKey((k) => k + 1);
    }
  }

  return (
    <div className="relative flex flex-col items-center rounded-2xl bg-white border border-black/6 shadow-sm p-6 overflow-hidden gap-4 transition-shadow duration-300 hover:shadow-md">
      {/* Flash overlay on value update */}
      {flashKey > 0 && (
        <motion.div
          key={flashKey}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ backgroundColor: colors.stroke + "18" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 self-start">
        <span className="text-primary/70">{icon}</span>
        <span className="text-sm font-semibold text-gray-600">{label}</span>
      </div>

      {/* Gauge + Center Value */}
      <div className="relative flex items-center justify-center">
        <CircularGauge pct={pct} strokeColor={colors.stroke} glowColor={colors.glow} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-3">
          <span className={`text-3xl font-bold tabular-nums leading-none ${colors.text}`}>
            {value !== null ? <AnimatedNumber value={displayValue} decimals={decimals} /> : "—"}
          </span>
          <span className="text-xs text-gray-400 mt-1 font-medium">{unit}</span>
        </div>
      </div>

      {/* Classification badge */}
      <motion.div
        key={classification}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`self-center px-3 py-1 rounded-full text-xs font-semibold ${colors.badgeBg} ${colors.badge}`}
      >
        {classification}
      </motion.div>
    </div>
  );
}
