import type { NotificationItem } from "@/types/device";
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

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/api/notifications`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{ success: boolean; data: { notifications: NotificationItem[] } }>(res);
  return json.data?.notifications ?? [];
}

export async function markAllNotificationsAsRead(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/read`, {
    method: "PATCH",
    headers: headers(token),
  });
  await handleResponse<{ success: boolean }>(res);
}

export async function deleteNotification(token: string, id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
    method: "DELETE",
    headers: headers(token),
  });
  await handleResponse<{ success: boolean }>(res);
}

export async function createTestNotification(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notifications/test`, {
    method: "POST",
    headers: headers(token),
  });
  await handleResponse<{ success: boolean }>(res);
}
