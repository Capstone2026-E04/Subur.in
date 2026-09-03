"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navConfig";
import { MdOutlineLogout, MdOutlineSpa } from "react-icons/md";
import { signOut } from "next-auth/react";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-col bg-primary text-white shadow-lg">
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
          <MdOutlineSpa size={18} className="text-white" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Subur.in</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV_ITEMS.filter((item) => !item.hidden).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-5 border-t border-white/10 pt-3">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer bg-red-800 text-white hover:bg-red-700"
        >
          <MdOutlineLogout size={18} className="shrink-0" />
          Keluar
        </button>
      </div>
    </aside>
  );
}
