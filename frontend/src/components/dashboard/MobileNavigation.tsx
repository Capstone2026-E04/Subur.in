"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { signOut } from "next-auth/react";
import { MdClose, MdMenu, MdOutlineLogout } from "react-icons/md";
import { NAV_ITEMS } from "./navConfig";

export default function MobileNavigation({ role }: { role?: string }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();
  const items = NAV_ITEMS.filter(
    (item) => !item.hidden && (!item.superadminOnly || role === "SUPERADMIN"),
  );

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Buka menu navigasi"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={() => dialogRef.current?.showModal()}
        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#073b2c] transition-colors hover:bg-emerald-50"
      >
        <MdMenu size={26} />
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Menu navigasi"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-white backdrop:bg-black/50"
      >
        <div className="flex h-full w-[min(20rem,85vw)] flex-col bg-[#073b2c] px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl">
          <div className="flex shrink-0 items-center justify-between gap-3 px-2">
            <Link
              href="/dashboard"
              onClick={() => dialogRef.current?.close()}
              className="flex items-center gap-2.5"
            >
              <Image
                src="/logo/logo-suburin-reverted.svg"
                alt=""
                width={32}
                height={32}
              />
              <span className="text-2xl font-bold tracking-tight">
                Subur.in
              </span>
            </Link>
            <button
              type="button"
              aria-label="Tutup menu navigasi"
              onClick={() => dialogRef.current?.close()}
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl hover:bg-white/10"
            >
              <MdClose size={24} />
            </button>
          </div>
          <nav
            aria-label="Navigasi mobile"
            className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain"
          >
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => dialogRef.current?.close()}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${pathname === item.href ? "bg-white/15 text-white" : "text-emerald-50/90 hover:bg-white/10"}`}
                >
                  <Icon size={24} /> {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => {
              dialogRef.current?.close();
              signOut({ callbackUrl: "/login" });
            }}
            className="mt-4 flex min-h-12 shrink-0 cursor-pointer items-center gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10"
          >
            <MdOutlineLogout size={24} /> Keluar
          </button>
        </div>
      </dialog>
    </div>
  );
}
