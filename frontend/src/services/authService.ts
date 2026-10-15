import { API_URL } from "@/services/api";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export async function registerUser(payload: RegisterPayload): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || "Registrasi gagal. Coba lagi nanti.");
  }
}
