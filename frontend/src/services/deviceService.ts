import type {
  RegisteredDevice,
  DiscoveredDevice,
  Plant,
  PolybagOption,
  ClaimDevicePayload,
  UpdateDevicePayload,
  SensorHistoryItem,
  DeviceRecommendation,
  RecommendationLogItem,
} from "@/types/device";
import { API_URL as API_BASE } from "@/services/api";

function headers(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      json?.message || `Request gagal: ${res.status} ${res.statusText}`
    );
  }
  return json as T;
}

export async function fetchDevices(token: string): Promise<RegisteredDevice[]> {
  const res = await fetch(`${API_BASE}/api/devices`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: { devices?: RegisteredDevice[]; data?: RegisteredDevice[] } | RegisteredDevice[] }>(res);
  if (Array.isArray(json)) return json;
  if (Array.isArray((json as { data: RegisteredDevice[] }).data)) return (json as { data: RegisteredDevice[] }).data;
  const inner = (json as { data: { devices?: RegisteredDevice[] } }).data;
  return inner?.devices ?? [];
}

export async function claimDevice(
  token: string,
  payload: ClaimDevicePayload
): Promise<RegisteredDevice> {
  const res = await fetch(`${API_BASE}/api/devices`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handleResponse<{ success: boolean; data: RegisteredDevice | { device: RegisteredDevice } }>(res);
  const data = (json as { data: RegisteredDevice | { device: RegisteredDevice } }).data;
  return (data as { device: RegisteredDevice }).device ?? data;
}

export async function updateDevice(
  token: string,
  id: string,
  payload: UpdateDevicePayload
): Promise<RegisteredDevice> {
  const res = await fetch(`${API_BASE}/api/devices/${id}`, {
    method: "PATCH",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  const json = await handleResponse<{ success: boolean; data: RegisteredDevice | { device: RegisteredDevice } }>(res);
  const data = (json as { data: RegisteredDevice | { device: RegisteredDevice } }).data;
  return (data as { device: RegisteredDevice }).device ?? data;
}

export async function deleteDevice(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/devices/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      json?.message || `Gagal menghapus alat: ${res.status} ${res.statusText}`
    );
  }
}

export async function fetchDiscoveredDevices(
  token: string
): Promise<DiscoveredDevice[]> {
  const res = await fetch(`${API_BASE}/api/devices/discovered`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{
    success: boolean;
    data: { devices?: DiscoveredDevice[] };
  }>(res);
  return json.data?.devices ?? [];
}

export async function fetchPlants(token: string): Promise<Plant[]> {
  const res = await fetch(`${API_BASE}/api/plants`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: Plant[] | { plants: Plant[] } }>(res);
  const data = (json as { data: Plant[] | { plants: Plant[] } }).data;
  if (Array.isArray(data)) return data;
  return (data as { plants: Plant[] }).plants ?? [];
}

export async function fetchPolybags(token: string): Promise<PolybagOption[]> {
  const res = await fetch(`${API_BASE}/api/polybags`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: PolybagOption[] | { polybags: PolybagOption[] } }>(res);
  const data = (json as { data: PolybagOption[] | { polybags: PolybagOption[] } }).data;
  if (Array.isArray(data)) return data;
  return (data as { polybags: PolybagOption[] }).polybags ?? [];
}

export async function fetchSensorHistory(
  token: string,
  deviceId: string,
  limit: number = 30
): Promise<SensorHistoryItem[]> { 
  const res = await fetch(`${API_BASE}/api/sensors/${deviceId}/history?limit=${limit}`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: SensorHistoryItem[] }>(res);
  return json.data ?? [];
}

export async function fetchDeviceRecommendation(
  token: string,
  deviceId: string
): Promise<DeviceRecommendation | null> {
  const res = await fetch(`${API_BASE}/api/devices/${deviceId}/recommendation`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: DeviceRecommendation | null }>(res);
  return json.data ?? null;
}

export async function fetchRecommendationHistory(
  token: string,
  deviceId?: string
): Promise<RecommendationLogItem[]> {
  const query = deviceId ? `?deviceId=${deviceId}` : "";
  const res = await fetch(`${API_BASE}/api/recommendations${query}`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: { logs: RecommendationLogItem[] } }>(res);
  return json.data?.logs ?? [];
}
