"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FcGoogle } from "react-icons/fc";
import { MdOutlineSpa, MdArrowBack, MdErrorOutline } from "react-icons/md";

function LoginError() {
  const searchParams = useSearchParams();
  const hasError = !!searchParams.get("error");

  if (!hasError) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-left">
      <MdErrorOutline size={18} className="text-rose-500 shrink-0" />
      <p className="text-xs text-rose-700">
        Gagal masuk dengan akun Google. Pastikan koneksi Anda stabil, lalu coba lagi.
      </p>
    </div>
  );
}

export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6">
      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary transition-colors"
      >
        <MdArrowBack size={14} />
        Kembali ke Beranda
      </Link>

      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md shadow-primary/15">
          <MdOutlineSpa size={26} />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-gray-800">Masuk ke Subur.in</h1>
          <p className="text-sm text-gray-500 max-w-xs">
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
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isSigningIn ? (
            <span className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
          ) : (
            <FcGoogle size={20} />
          )}
          {isSigningIn ? "Menghubungkan…" : "Lanjutkan dengan Google"}
        </button>

        <p className="text-center text-[11px] text-gray-400 leading-relaxed">
          Dengan masuk, Anda menyetujui bahwa data perangkat dan sensor Anda akan disimpan untuk keperluan pemantauan tanaman.
        </p>
      </div>
    </main>
  );
}
