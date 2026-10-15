"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { MdOutlineLogout } from "react-icons/md";
import {
  Sidebar as SidebarRoot,
  SidebarBody,
  SidebarLink,
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "./navConfig";

function LogoutButton() {
  const { open } = useSidebar();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="Keluar"
      title="Keluar"
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-[#8b3a3a] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#9c4343]"
    >
      <MdOutlineLogout size={22} className="shrink-0" />
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          display: open ? "inline-block" : "none",
        }}
        className="!m-0 !p-0 whitespace-pre"
      >
        Keluar
      </motion.span>
    </button>
  );
}

function Logo() {
  const { open } = useSidebar();
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <Image
        src="/logo/logo-suburin-reverted.svg"
        alt="Subur.in"
        width={32}
        height={32}
        className="shrink-0"
      />
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          display: open ? "inline-block" : "none",
        }}
        className="!m-0 !p-0 text-2xl font-bold tracking-tight whitespace-pre text-[#f1e8a6]"
      >
        Subur.in
      </motion.span>
    </div>
  );
}

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();

  return (
    <SidebarRoot>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <Logo />

          <nav aria-label="Menu utama" className="mt-6 flex flex-col gap-0.5">
            {NAV_ITEMS.filter(
              (item) =>
                !item.hidden && (!item.superadminOnly || role === "SUPERADMIN"),
            ).map((item) => {
              const Icon = item.icon;
              return (
                <SidebarLink
                  key={item.href}
                  active={pathname === item.href}
                  link={{
                    label: item.label,
                    href: item.href,
                    icon: (
                      <Icon size={24} className="shrink-0 text-[#f5eec3]" />
                    ),
                  }}
                />
              );
            })}
          </nav>
        </div>

        <LogoutButton />
      </SidebarBody>
    </SidebarRoot>
  );
}
