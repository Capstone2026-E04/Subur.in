"use client";

import { useCallback, useEffect, useId, useState } from "react";
import {
  MdHistory,
  MdOutlineScience,
  MdSchedule,
  MdWarningAmber,
} from "react-icons/md";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createCorrection, fetchCorrections } from "@/services/deviceService";
import type {
  CorrectionMethod,
  CorrectionRecord,
  CorrectionType,
  DeviceRecommendation,
} from "@/types/device";

const WAIT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const TYPE_OPTIONS: { value: CorrectionType; label: string }[] = [
  { value: "LIME", label: "Dolomit" },
  { value: "SULFUR", label: "Sulfur" },
];

const METHOD_OPTIONS: { value: CorrectionMethod; label: string }[] = [
  { value: "INCORPORATION", label: "Dicampur ke media" },
  { value: "TOP_DRESSING", label: "Ditabur di permukaan" },
];

const typeLabel = (type: CorrectionType) =>
  TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
const methodLabel = (method: CorrectionMethod) =>
  METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const inputClass =
  "focus:border-primary focus:ring-primary/20 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-gray-700 transition focus:ring-2 focus:outline-none";

interface ChoiceGroupProps<T extends string> {
  legend: string;
  name: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-gray-600">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`focus-within:ring-primary/30 flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-semibold transition focus-within:ring-2 ${
              value === opt.value
                ? "border-primary bg-primary/8 text-primary"
                : "border-black/10 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface Props {
  token: string;
  deviceId: string;
  recommendation: DeviceRecommendation | null;
  onSaved?: () => void;
}

export default function CorrectionPanel({
  token,
  deviceId,
  recommendation,
  onSaved,
}: Props) {
  const uid = useId();
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [type, setType] = useState<CorrectionType>("LIME");
  const [method, setMethod] = useState<CorrectionMethod>("INCORPORATION");
  const [dose, setDose] = useState("");
  const [phBefore, setPhBefore] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchCorrections(token, deviceId)
      .then((data) => {
        if (!active) return;
        setCorrections(data);
        setNow(Date.now());
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : "Gagal memuat riwayat koreksi.",
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, deviceId, reloadKey]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const latest = corrections[0];
  const waitEndsAt = latest
    ? new Date(new Date(latest.appliedAt).getTime() + WAIT_DAYS * DAY_MS)
    : null;
  const isWaiting =
    waitEndsAt !== null && now !== null && waitEndsAt.getTime() > now;

  function fillFromRecommendation() {
    if (!recommendation) return;
    const suggested =
      recommendation.phAction === "LIME" || recommendation.phAction === "SULFUR"
        ? recommendation.phAction
        : null;
    if (suggested) setType(suggested);
    const suggestedDose =
      suggested === "LIME"
        ? recommendation.limeDosageGram
        : suggested === "SULFUR"
          ? recommendation.sulfurDosageGram
          : 0;
    if (suggestedDose > 0) setDose(String(suggestedDose));
    setPhBefore(recommendation.phValue.toFixed(1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const doseValue = Number(dose);
    const phValue = Number(phBefore);
    if (!dose || !Number.isFinite(doseValue) || doseValue <= 0) {
      setFormError("Dosis harus berupa angka lebih dari 0 gram.");
      return;
    }
    if (!phBefore || !Number.isFinite(phValue) || phValue < 0 || phValue > 14) {
      setFormError("pH sebelum koreksi harus berupa angka 0 sampai 14.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCorrection(token, deviceId, {
        type,
        method,
        doseGram: doseValue,
        phBefore: phValue,
        ...(appliedAt && { appliedAt: new Date(appliedAt).toISOString() }),
      });
      setDose("");
      setPhBefore("");
      setAppliedAt("");
      setNotice(
        `Koreksi dicatat. Rekomendasi koreksi pH berikutnya ditunda ${WAIT_DAYS} hari.`,
      );
      reload();
      onSaved?.();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Gagal menyimpan koreksi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorId = `${uid}-error`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4">
        <div className="flex items-center gap-2">
          <MdOutlineScience className="text-primary" size={20} />
          <h3 className="text-primary text-sm font-bold">Catat Koreksi pH</h3>
        </div>
        {recommendation && (
          <button
            type="button"
            onClick={fillFromRecommendation}
            className="text-primary focus-visible:ring-primary/40 min-h-11 cursor-pointer rounded-lg px-2 text-xs font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Isi dari rekomendasi
          </button>
        )}
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        <p className="text-xs leading-relaxed text-gray-500">
          Catat dolomit atau sulfur yang benar-benar sudah Anda berikan. Setelah
          koreksi dicatat, sistem menunda rekomendasi koreksi pH berikutnya
          selama {WAIT_DAYS} hari agar tidak memberikan bahan berulang.
        </p>

        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs font-semibold ${
            isWaiting
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-black/5 bg-gray-50 text-gray-600"
          }`}
        >
          {isWaiting ? (
            <MdWarningAmber className="mt-0.5 shrink-0" size={16} />
          ) : (
            <MdSchedule className="mt-0.5 shrink-0" size={16} />
          )}
          <span>
            {isWaiting && waitEndsAt
              ? `Periode tunggu aktif sampai ${formatDate(waitEndsAt.toISOString())}.`
              : latest
                ? "Periode tunggu sudah selesai."
                : "Belum ada koreksi tercatat untuk alat ini."}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChoiceGroup
              legend="Bahan koreksi"
              name={`${uid}-type`}
              options={TYPE_OPTIONS}
              value={type}
              onChange={setType}
            />
            <ChoiceGroup
              legend="Metode aplikasi"
              name={`${uid}-method`}
              options={METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
            />

            <div className="space-y-1.5">
              <label
                htmlFor={`${uid}-dose`}
                className="text-xs font-semibold text-gray-600"
              >
                Dosis aktual (gram)
              </label>
              <input
                id={`${uid}-dose`}
                type="number"
                inputMode="decimal"
                min="0.1"
                step="0.1"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                aria-describedby={formError ? errorId : undefined}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`${uid}-ph`}
                className="text-xs font-semibold text-gray-600"
              >
                pH sebelum koreksi
              </label>
              <input
                id={`${uid}-ph`}
                type="number"
                inputMode="decimal"
                min="0"
                max="14"
                step="0.1"
                value={phBefore}
                onChange={(e) => setPhBefore(e.target.value)}
                aria-describedby={formError ? errorId : undefined}
                className={inputClass}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor={`${uid}-date`}
                className="text-xs font-semibold text-gray-600"
              >
                Waktu aplikasi (opsional)
              </label>
              <input
                id={`${uid}-date`}
                type="datetime-local"
                max={toLocalInputValue(new Date())}
                value={appliedAt}
                onChange={(e) => setAppliedAt(e.target.value)}
                className={`${inputClass} sm:max-w-xs`}
              />
              <p className="text-[11px] text-gray-500">
                Kosongkan untuk memakai waktu sekarang.
              </p>
            </div>
          </div>

          {formError && (
            <p
              id={errorId}
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
            >
              {formError}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800"
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary-light focus-visible:ring-primary/40 min-h-11 cursor-pointer rounded-xl px-5 text-sm font-bold text-white transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan koreksi"}
          </button>
        </form>

        <div className="space-y-3 border-t border-black/5 pt-5">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
            <MdHistory size={16} className="text-gray-400" />
            Riwayat koreksi
          </h4>

          {isLoading ? (
            <p className="text-xs text-gray-500" role="status">
              Memuat riwayat...
            </p>
          ) : loadError ? (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <p role="alert" className="font-semibold text-rose-700">
                {loadError}
              </p>
              <button
                type="button"
                onClick={reload}
                className="text-primary min-h-11 cursor-pointer font-bold hover:underline"
              >
                Coba lagi
              </button>
            </div>
          ) : corrections.length === 0 ? (
            <p className="text-xs text-gray-500">
              Belum ada koreksi yang dicatat.
            </p>
          ) : (
            <ul className="divide-y divide-black/5 rounded-xl border border-black/5">
              {corrections.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-gray-800">
                      {typeLabel(c.type)} · {c.doseGram} g
                    </p>
                    <p className="text-gray-500">
                      {methodLabel(c.method)} · pH sebelum {c.phBefore}
                    </p>
                  </div>
                  <time
                    dateTime={c.appliedAt}
                    className="font-semibold text-gray-500"
                  >
                    {formatDate(c.appliedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
