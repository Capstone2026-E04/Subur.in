import type { SuperadminResource } from "@/services/superadminService";

export type CellFormat = "text" | "date" | "bool" | "number";

export interface Column {
  header: string;
  path: string;
  format?: CellFormat;
  sortable?: boolean;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

export interface Tab {
  key: SuperadminResource;
  label: string;
  searchPlaceholder: string;
  columns: Column[];
  filters: FilterConfig[];
  filterByDevice: boolean;
}

const YES_NO = [
  { value: "true", label: "Ya" },
  { value: "false", label: "Tidak" },
];

const IS_DEV: FilterConfig = {
  key: "isDev",
  label: "Data Dev",
  options: YES_NO,
};

export const TABS: Tab[] = [
  {
    key: "users",
    label: "Pengguna",
    searchPlaceholder: "Cari nama atau email",
    filterByDevice: false,
    filters: [
      {
        key: "role",
        label: "Role",
        options: [
          { value: "USER", label: "USER" },
          { value: "SUPERADMIN", label: "SUPERADMIN" },
        ],
      },
      {
        key: "telegramNotifyEnabled",
        label: "Notifikasi Telegram",
        options: YES_NO,
      },
    ],
    columns: [
      { header: "Nama", path: "name", sortable: true },
      { header: "Email", path: "email", sortable: true },
      { header: "Role", path: "role", sortable: true },
      { header: "Google ID", path: "googleId" },
      { header: "Telegram Chat ID", path: "telegramChatId" },
      {
        header: "Notifikasi Telegram",
        path: "telegramNotifyEnabled",
        format: "bool",
      },
      { header: "Dibuat", path: "createdAt", format: "date", sortable: true },
      { header: "ID", path: "id" },
    ],
  },
  {
    key: "devices",
    label: "Perangkat",
    searchPlaceholder: "Cari label, kode, pemilik, atau tanaman",
    filterByDevice: false,
    filters: [
      {
        key: "status",
        label: "Status",
        options: [
          { value: "ACTIVE", label: "ACTIVE" },
          { value: "INACTIVE", label: "INACTIVE" },
          { value: "OFFLINE", label: "OFFLINE" },
        ],
      },
    ],
    columns: [
      { header: "Label", path: "label", sortable: true },
      { header: "Kode", path: "deviceCode", sortable: true },
      { header: "Pemilik", path: "user.email", sortable: true },
      { header: "Tanaman", path: "plant.name", sortable: true },
      { header: "Status", path: "status", sortable: true },
      {
        header: "Interval (mnt)",
        path: "sensorInterval",
        format: "number",
        sortable: true,
      },
      {
        header: "Terakhir Aktif",
        path: "lastSeenAt",
        format: "date",
        sortable: true,
      },
      { header: "Dibuat", path: "createdAt", format: "date", sortable: true },
      { header: "ID", path: "id" },
    ],
  },
  {
    key: "plants",
    label: "Tanaman",
    searchPlaceholder: "Cari nama atau nama ilmiah",
    filterByDevice: false,
    filters: [],
    columns: [
      { header: "Nama", path: "name", sortable: true },
      { header: "Nama Ilmiah", path: "scientificName" },
      { header: "pH Min", path: "minPh", format: "number", sortable: true },
      { header: "pH Maks", path: "maxPh", format: "number", sortable: true },
      {
        header: "pH Target",
        path: "phTarget",
        format: "number",
        sortable: true,
      },
      { header: "Dibuat", path: "createdAt", format: "date", sortable: true },
      { header: "ID", path: "id" },
    ],
  },
  {
    key: "recommendations",
    label: "Rekomendasi",
    searchPlaceholder: "Cari tindakan atau perangkat",
    filterByDevice: true,
    filters: [
      { key: "reduceWatering", label: "Kurangi Air", options: YES_NO },
      IS_DEV,
    ],
    columns: [
      { header: "Waktu", path: "createdAt", format: "date", sortable: true },
      { header: "Perangkat", path: "device.label", sortable: true },
      { header: "pH", path: "phValue", format: "number", sortable: true },
      {
        header: "Kelembapan",
        path: "moistureValue",
        format: "number",
        sortable: true,
      },
      { header: "Kategori", path: "categoryCode", sortable: true },
      { header: "Tindakan", path: "actionText" },
      {
        header: "Air (L)",
        path: "waterVolumeLiter",
        format: "number",
        sortable: true,
      },
      {
        header: "Kapur (g)",
        path: "limeDosageGram",
        format: "number",
        sortable: true,
      },
      {
        header: "Sulfur (g)",
        path: "sulfurDosageGram",
        format: "number",
        sortable: true,
      },
      { header: "Kurangi Air", path: "reduceWatering", format: "bool" },
      { header: "Dev", path: "isDev", format: "bool" },
    ],
  },
  {
    key: "corrections",
    label: "Koreksi pH",
    searchPlaceholder: "Cari perangkat",
    filterByDevice: true,
    filters: [
      {
        key: "type",
        label: "Jenis",
        options: [
          { value: "LIME", label: "LIME" },
          { value: "SULFUR", label: "SULFUR" },
        ],
      },
      {
        key: "method",
        label: "Metode",
        options: [
          { value: "INCORPORATION", label: "INCORPORATION" },
          { value: "TOP_DRESSING", label: "TOP_DRESSING" },
        ],
      },
    ],
    columns: [
      {
        header: "Diterapkan",
        path: "appliedAt",
        format: "date",
        sortable: true,
      },
      { header: "Perangkat", path: "device.label", sortable: true },
      { header: "Jenis", path: "type", sortable: true },
      { header: "Metode", path: "method", sortable: true },
      {
        header: "Dosis (g)",
        path: "doseGram",
        format: "number",
        sortable: true,
      },
      {
        header: "pH Sebelum",
        path: "phBefore",
        format: "number",
        sortable: true,
      },
    ],
  },
  {
    key: "sensor-logs",
    label: "Log Sensor",
    searchPlaceholder: "Cari perangkat",
    filterByDevice: true,
    filters: [IS_DEV],
    columns: [
      { header: "Waktu", path: "timestamp", format: "date", sortable: true },
      { header: "Perangkat", path: "device.label", sortable: true },
      { header: "pH", path: "ph", format: "number", sortable: true },
      {
        header: "Kelembapan",
        path: "moisture",
        format: "number",
        sortable: true,
      },
      { header: "Dev", path: "isDev", format: "bool" },
    ],
  },
  {
    key: "notifications",
    label: "Notifikasi",
    searchPlaceholder: "Cari judul, pesan, atau perangkat",
    filterByDevice: true,
    filters: [
      {
        key: "type",
        label: "Tipe",
        options: [
          { value: "warning", label: "warning" },
          { value: "success", label: "success" },
          { value: "info", label: "info" },
        ],
      },
      { key: "isRead", label: "Dibaca", options: YES_NO },
    ],
    columns: [
      { header: "Waktu", path: "createdAt", format: "date", sortable: true },
      { header: "Perangkat", path: "device.label", sortable: true },
      { header: "Judul", path: "title", sortable: true },
      { header: "Pesan", path: "message" },
      { header: "Tipe", path: "type", sortable: true },
      { header: "Dibaca", path: "isRead", format: "bool", sortable: true },
    ],
  },
];
