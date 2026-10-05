import { API_URL as API_BASE } from "@/services/api";

async function request(
  token: string,
  method: "GET" | "PUT",
  body?: object,
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/dev-mode`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Request gagal: ${res.status}`);
  return json.data.enabled;
}

export const fetchDevMode = (token: string) => request(token, "GET");
export const setDevMode = (token: string, enabled: boolean) =>
  request(token, "PUT", { enabled });
