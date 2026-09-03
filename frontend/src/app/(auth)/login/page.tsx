"use client";

import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-2xl font-semibold">Masuk ke Subur.in</h1>
      <button
        id="btn-login-google"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors cursor-pointer"
      >
        <FcGoogle size={18} />
        Login dengan Google
      </button>
    </main>
  );
}
