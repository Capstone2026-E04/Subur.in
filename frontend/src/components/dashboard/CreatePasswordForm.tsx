"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MdErrorOutline, MdCheckCircleOutline } from "react-icons/md";
import AuthInput from "@/components/auth/AuthInput";
import { createPassword } from "@/services/userService";

const MIN_PASSWORD_LENGTH = 8;

export default function CreatePasswordForm({
  backendToken,
}: {
  backendToken?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!backendToken) {
      setError("Sesi tidak valid. Silakan masuk kembali.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPassword(backendToken, { password, confirmPassword });
      setPassword("");
      setConfirmPassword("");
      setIsDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
        <MdCheckCircleOutline size={18} className="shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-700">
          Password berhasil dibuat. Sekarang Anda juga bisa masuk dengan email
          dan password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-neutral-500">
        Akun Anda terdaftar melalui Google. Buat password agar Anda juga bisa
        masuk dengan email dan password.
      </p>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3"
        >
          <MdErrorOutline size={18} className="shrink-0 text-rose-500" />
          <p className="text-xs text-rose-700">{error}</p>
        </div>
      )}

      <AuthInput
        id="create-password"
        label={`Password Baru (minimal ${MIN_PASSWORD_LENGTH} karakter)`}
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isSubmitting}
      />
      <AuthInput
        id="create-password-confirm"
        label="Konfirmasi Password"
        type="password"
        autoComplete="new-password"
        required
        maxLength={128}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        disabled={isSubmitting}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary hover:bg-primary-light cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Menyimpan…" : "Buat Password"}
      </button>
    </form>
  );
}
