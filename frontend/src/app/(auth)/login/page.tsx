"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { MdErrorOutline } from "react-icons/md";
import AuthInput from "@/components/auth/AuthInput";
import AuthShell from "@/components/auth/AuthShell";

const CREDENTIAL_ERRORS: Record<string, string> = {
  invalid_credentials:
    "Email atau password salah. Jika Anda mendaftar dengan Google, masuk dengan Google lalu buat password di halaman profil.",
  too_many_attempts:
    "Terlalu banyak percobaan login gagal. Coba lagi dalam beberapa menit.",
  service_unavailable: "Layanan sedang tidak tersedia. Coba lagi nanti.",
};

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left"
    >
      <MdErrorOutline size={18} className="shrink-0 text-rose-500" />
      <p className="text-xs text-rose-700">{message}</p>
    </div>
  );
}

function GoogleLoginError() {
  const searchParams = useSearchParams();

  if (!searchParams.get("error")) return null;

  return (
    <ErrorBanner message="Gagal masuk dengan akun Google. Pastikan koneksi Anda stabil, lalu coba lagi." />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const isBusy = isSigningIn || isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setFormError(
        CREDENTIAL_ERRORS[result.code ?? ""] ??
          CREDENTIAL_ERRORS.invalid_credentials,
      );
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Masuk ke Subur.in"
      description="Pantau tanaman dan dapatkan rekomendasi perawatan otomatis."
      backHref="/"
      backLabel="Kembali ke Beranda"
    >
      <Suspense fallback={null}>
        <GoogleLoginError />
      </Suspense>

      {formError && <ErrorBanner message={formError} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="login-email"
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
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isBusy}
        />
        <button
          id="btn-login-email"
          type="submit"
          disabled={isBusy}
          className="bg-primary hover:bg-primary-light focus-visible:ring-primary/40 flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Memproses…" : "Masuk"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="h-px flex-1 bg-black/10" />
        atau
        <span className="h-px flex-1 bg-black/10" />
      </div>

      <button
        id="btn-login-google"
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
        {isSigningIn ? "Menghubungkan…" : "Lanjutkan dengan Google"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="text-primary font-semibold hover:underline"
        >
          Daftar
        </Link>
      </p>

      <p className="text-center text-xs leading-relaxed text-gray-600">
        Dengan masuk, Anda menyetujui bahwa data perangkat dan sensor Anda akan
        disimpan untuk keperluan pemantauan tanaman.
      </p>
    </AuthShell>
  );
}
