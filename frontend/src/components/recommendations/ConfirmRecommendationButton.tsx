"use client";

import { useState } from "react";
import { MdCheckCircle } from "react-icons/md";
import { confirmRecommendation } from "@/services/deviceService";

export default function ConfirmRecommendationButton({
  token,
  deviceId,
  confirmedAt,
  onConfirmed,
}: {
  token: string | null;
  deviceId: string;
  confirmedAt?: string | null;
  onConfirmed: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirmedAt) {
    return (
      <p className="text-primary flex items-center gap-1.5 text-sm font-medium">
        <MdCheckCircle size={18} /> Sudah dilaksanakan (
        {new Date(confirmedAt).toLocaleString("id-ID")})
      </p>
    );
  }

  async function handleClick() {
    if (!token) return;
    setPending(true);
    setError(null);
    try {
      await confirmRecommendation(token, deviceId);
      onConfirmed();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal mengonfirmasi rekomendasi.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || !token}
        className="bg-primary inline-flex min-h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        <MdCheckCircle size={18} />
        {pending ? "Menyimpan..." : "Tandai sudah dilaksanakan"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
