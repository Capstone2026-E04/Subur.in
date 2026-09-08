"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { MdOutlineLogout, MdOutlineSpa } from "react-icons/md";
import { Sidebar as SidebarRoot, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { NAV_ITEMS } from "./navConfig";

function LogoutButton() {
  const { open } = useSidebar();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer bg-red-800 text-white hover:bg-red-700"
    >
      <MdOutlineLogout size={18} className="shrink-0" />
      <motion.span
        animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
        className="whitespace-pre !p-0 !m-0"
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
        animate={{ opacity: open ? 1 : 0, display: open ? "inline-block" : "none" }}
        className="text-lg font-semibold tracking-tight text-white whitespace-pre !p-0 !m-0"
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
        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
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
