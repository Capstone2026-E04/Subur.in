"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { MdOutlineLogout, MdOutlineSpa } from "react-icons/md";
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
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-red-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
    >
      <MdOutlineLogout size={18} className="shrink-0" />
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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
        <MdOutlineSpa size={18} className="text-white" />
      </div>
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          display: open ? "inline-block" : "none",
        }}
        className="!m-0 !p-0 text-lg font-semibold tracking-tight whitespace-pre text-white"
      >
        Subur.in
      </motion.span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <SidebarRoot>
      <SidebarBody className="justify-between gap-10">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <Logo />

          <nav className="mt-6 flex flex-col gap-0.5">
            {NAV_ITEMS.filter((item) => !item.hidden).map((item) => {
              const Icon = item.icon;
              return (
                <SidebarLink
                  key={item.href}
                  active={pathname === item.href}
                  link={{
                    label: item.label,
                    href: item.href,
                    icon: <Icon size={18} className="shrink-0" />,
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
