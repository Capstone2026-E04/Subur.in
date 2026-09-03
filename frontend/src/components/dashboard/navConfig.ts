import {
  MdDashboard,
  MdOutlineSpa,
  MdBarChart,
  MdSettings,
  MdNotifications,
  MdAccountCircle,
  MdComputer,
  MdAutoAwesome
} from "react-icons/md";
import { IconType } from "react-icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  hidden?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
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
    label: "Tanaman",
    href: "/dashboard/plants",
    icon: MdOutlineSpa,
  },
  {
    label: "Analitik",
    href: "/dashboard/analytics",
    icon: MdBarChart,
  },
  {
    label: "Notifikasi",
    href: "/dashboard/notifications",
    icon: MdNotifications,
  },
  {
    label: "Pengaturan",
    href: "/dashboard/settings",
    icon: MdSettings,
  },
  {
    label: "Profil",
    href: "/dashboard/profile",
    icon: MdAccountCircle,
    hidden: true,
  },
];
