"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { MdArrowBack, MdErrorOutline } from "react-icons/md";

function LoginError() {
  const searchParams = useSearchParams();
  const hasError = !!searchParams.get("error");

  if (!hasError) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left">
      <MdErrorOutline size={18} className="shrink-0 text-rose-500" />
      <p className="text-xs text-rose-700">
        Gagal masuk dengan akun Google. Pastikan koneksi Anda stabil, lalu coba
        lagi.
      </p>
    </div>
  );
}

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 px-4">
      <Link
        href="/"
        className="hover:text-primary focus-visible:ring-primary/40 absolute top-4 left-4 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-gray-600 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <MdArrowBack size={14} />
        Kembali ke Beranda
      </Link>

      <div className="flex flex-col items-center gap-3">
        <Image src="/logo/logo-suburin.svg" alt="" width={56} height={56} />
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold text-gray-800">Masuk ke Subur.in</h1>
          <p className="max-w-xs text-sm text-gray-600">
            Pantau tanaman dan dapatkan rekomendasi perawatan otomatis dari AI.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Suspense fallback={null}>
          <LoginError />
        </Suspense>

        <button
          id="btn-login-google"
          onClick={() => {
            setIsSigningIn(true);
            signIn("google", { callbackUrl: "/dashboard" });
          }}
          disabled={isSigningIn}
          className="focus-visible:ring-primary/40 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-5 text-sm font-semibold text-gray-800 shadow-sm transition-all duration-200 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningIn ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600 motion-reduce:animate-none" />
          ) : (
            <FcGoogle size={20} />
          )}
          {isSigningIn ? "Menghubungkan…" : "Lanjutkan dengan Google"}
        </button>

        <p className="text-center text-xs leading-relaxed text-gray-600">
          Dengan masuk, Anda menyetujui bahwa data perangkat dan sensor Anda
          akan disimpan untuk keperluan pemantauan tanaman.
        </p>
      </div>
    </main>
  );
}
