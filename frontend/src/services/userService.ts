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

export async function fetchMe(
  token: string
): Promise<{ isTelegramLinked: boolean }> {
  const res = await fetch(`${API_BASE}/api/users/me`, {
    headers: headers(token),
    cache: "no-store",
  });
  const json = await handleResponse<{
    success: boolean;
    data: { user: { isTelegramLinked: boolean } };
  }>(res);
  return json.data.user;
}

export async function generateTelegramLinkCode(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/users/me/telegram/link-code`, {
    method: "POST",
    headers: headers(token),
  });
  const json = await handleResponse<{
    success: boolean;
    data: { linkCode: string };
  }>(res);
  return json.data.linkCode;
}

export async function disconnectTelegram(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/users/me/telegram`, {
    method: "DELETE",
    headers: headers(token),
  });
  await handleResponse(res);
}
