"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { MdErrorOutline } from "react-icons/md";
import AuthInput from "@/components/auth/AuthInput";
import AuthShell from "@/components/auth/AuthShell";
import { registerUser } from "@/services/authService";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy = isSigningIn || isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password minimal ${MIN_PASSWORD_LENGTH} karakter.`);
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser({ name, email, password });
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Registrasi gagal.",
      );
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Daftar di Subur.in"
      description="Buat akun untuk mulai memantau tanaman Anda."
      backHref="/login"
      backLabel="Kembali ke Halaman Masuk"
    >
      {formError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left"
        >
          <MdErrorOutline size={18} className="shrink-0 text-rose-500" />
          <p className="text-xs text-rose-700">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="register-name"
          label="Nama"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isBusy}
        />
        <AuthInput
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isBusy}
        />
        <AuthInput
          id="register-password"
          label={`Password (minimal ${MIN_PASSWORD_LENGTH} karakter)`}
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isBusy}
        />
        <AuthInput
          id="register-confirm-password"
          label="Konfirmasi Password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={128}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isBusy}
        />
        <button
          id="btn-register"
          type="submit"
          disabled={isBusy}
          className="bg-primary hover:bg-primary-light focus-visible:ring-primary/40 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Memproses…" : "Daftar"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="h-px flex-1 bg-black/10" />
        atau
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <button
        id="btn-register-google"
        type="button"
        onClick={() => {
          setIsSigningIn(true);
          signIn("google", { callbackUrl: "/dashboard" });
        }}
        disabled={isBusy}
        className="focus-visible:ring-primary/40 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningIn ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 motion-reduce:animate-none" />
        ) : (
          <FcGoogle size={20} />
        )}
        {isSigningIn ? "Menghubungkan…" : "Daftar dengan Google"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="text-primary font-semibold hover:underline"
        >
          Masuk
        </Link>
      </p>
    </AuthShell>
  );
}
