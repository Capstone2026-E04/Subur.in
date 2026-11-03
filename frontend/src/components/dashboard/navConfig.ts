import {
  MdDashboard,
  MdOutlineSpa,
  MdBarChart,
  MdSettings,
  MdComputer,
  MdAutoAwesome,
  MdAdminPanelSettings,
} from "react-icons/md";
import { IconType } from "react-icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  hidden?: boolean;
  superadminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Ringkasan",
    href: "/dashboard",
    icon: MdDashboard,
  },
  {
    label: "Perangkat",
    href: "/dashboard/devices",
    icon: MdComputer,
  },
  {
    label: "Rekomendasi",
    href: "/dashboard/recommendations",
    icon: MdAutoAwesome,
  },
  {
    label: "Riwayat",
    href: "/dashboard/analytics",
    icon: MdBarChart,
  },
  {
    label: "Tanaman",
    href: "/dashboard/plants",
    icon: MdOutlineSpa,
  },
  {
    label: "Pengaturan",
    href: "/dashboard/settings",
    icon: MdSettings,
  },
  {
    label: "Superadmin",
    href: "/dashboard/superadmin",
    icon: MdAdminPanelSettings,
    superadminOnly: true,
    hidden: true,
  },
];

export const visibleNavItems = (role?: string) =>
  NAV_ITEMS.filter(
    (item) => !item.hidden && (!item.superadminOnly || role === "SUPERADMIN"),
  );
