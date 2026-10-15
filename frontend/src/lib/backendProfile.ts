import { API_URL } from "@/services/api";

export interface BackendProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "USER" | "SUPERADMIN";
}

export async function fetchUserProfile(
  backendToken: string,
): Promise<BackendProfile | null> {
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${backendToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.user ?? null;
  } catch {
    return null;
  }
}
