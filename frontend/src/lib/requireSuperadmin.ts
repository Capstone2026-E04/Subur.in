import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { fetchUserProfile } from "@/lib/backendProfile";

export async function requireSuperadmin() {
  const session = await auth();
  const backendToken = session?.user?.backendToken;

  if (!backendToken) {
    redirect("/login");
  }

  const profile = await fetchUserProfile(backendToken);

  if (profile?.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }
}
