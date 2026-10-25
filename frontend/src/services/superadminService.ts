import { API_URL } from "@/services/api";

export type SuperadminResource =
  | "users"
  | "devices"
  | "plants"
  | "recommendations"
  | "sensor-logs"
  | "notifications";

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type SuperadminRow = Record<string, unknown>;

export interface ListParams {
  page: number;
  sortBy?: string;
  order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string>;
  from?: string;
  to?: string;
}

export interface DeviceOption {
  id: string;
  label: string;
  deviceCode: string;
  user: { name: string; email: string };
}

export interface SensorPoint {
  id: number;
  timestamp: string;
  ph: number;
  moisture: number;
}

async function request<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}/api/superadmin/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.message || `Request gagal: ${res.status} ${res.statusText}`,
    );
  }
  return json as T;
}

export async function fetchSuperadminOverview(
  token: string,
): Promise<Record<SuperadminResource, number>> {
  const json = await request<{
    data: { overview: Record<SuperadminResource, number> };
  }>("overview", token);
  return json.data.overview;
}

export async function fetchSuperadminResource(
  token: string,
  resource: SuperadminResource,
  params: ListParams,
): Promise<{ items: SuperadminRow[]; meta: PageMeta }> {
  const query = new URLSearchParams({ page: String(params.page) });
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortBy && params.order) query.set("order", params.order);
  if (params.search) query.set("search", params.search);
  if (params.from) query.set("from", `${params.from}T00:00:00+07:00`);
  if (params.to) query.set("to", `${params.to}T23:59:59.999+07:00`);
  for (const [key, value] of Object.entries(params.filters ?? {})) {
    if (value) query.set(key, value);
  }

  const json = await request<{
    data: { items: SuperadminRow[] };
    meta: PageMeta;
  }>(`${resource}?${query.toString()}`, token);
  return { items: json.data.items, meta: json.meta };
}

export async function fetchSuperadminDeviceOptions(
  token: string,
): Promise<DeviceOption[]> {
  const json = await request<{ data: { devices: DeviceOption[] } }>(
    "device-options",
    token,
  );
  return json.data.devices;
}

export async function fetchSuperadminSensorHistory(
  token: string,
  deviceId: string,
  limit = 100,
): Promise<SensorPoint[]> {
  const json = await request<{ data: { items: SensorPoint[] } }>(
    `sensor-history?deviceId=${encodeURIComponent(deviceId)}&limit=${limit}`,
    token,
  );
  return json.data.items;
}
