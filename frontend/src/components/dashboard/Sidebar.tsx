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
import { type NavItem, visibleNavItems } from "./navConfig";

function LogoutButton() {
  const { open } = useSidebar();
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      aria-label="Keluar"
      title="Keluar"
      className="relative z-10 flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 text-base font-medium text-white transition-colors hover:bg-white/10"
    >
      <MdOutlineLogout size={22} className="shrink-0" />
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          display: open ? "inline-block" : "none",
        }}
        className="m-0! p-0! whitespace-pre"
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
        className="m-0! p-0! text-2xl font-bold tracking-tight whitespace-pre text-white"
      >
        Subur.in
      </motion.span>
    </div>
  );
}

export default function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = visibleNavItems(role);
  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    return (
      <SidebarLink
        key={item.href}
        active={pathname === item.href}
        className={pathname === item.href ? "bg-white/15" : ""}
        link={{
          label: item.label,
          href: item.href,
          icon: <Icon size={24} className="shrink-0 text-white" />,
        }}
      />
    );
  };

  return (
    <div className="hidden h-full shrink-0 md:flex">
      <SidebarRoot open animate={false}>
        <SidebarBody className="bg-primary relative justify-between gap-10 overflow-hidden py-7">
          <div className="relative z-10 flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <Logo />

            <nav aria-label="Menu utama" className="mt-6 flex flex-col gap-0.5">
              {items.map(renderLink)}
            </nav>
          </div>

          <Image
            src="/illustrations/dashboard-plant.svg"
            alt=""
            width={256}
            height={300}
            className="pointer-events-none absolute -bottom-12 -left-8 w-64 opacity-10"
          />
          <LogoutButton />
        </SidebarBody>
      </SidebarRoot>
    </div>
  );
}
