import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { API_URL } from "@/services/api";

async function fetchUserProfile(backendToken: string) {
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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const backendToken = session.user.backendToken;
  const backendUser = backendToken ? await fetchUserProfile(backendToken) : null;

  const freshUser = {
    name: backendUser?.name ?? session.user.name,
    email: backendUser?.email ?? session.user.email,
    image: backendUser?.avatarUrl ?? session.user.image,
  };

  return (
    <SessionProvider session={session} basePath="/api/nextauth">
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar user={freshUser} />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
