import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import DashboardMotion from "@/components/dashboard/DashboardMotion";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { fetchUserProfile } from "@/lib/backendProfile";

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
  const backendUser = backendToken
    ? await fetchUserProfile(backendToken)
    : null;

  const freshUser = {
    name: backendUser?.name ?? session.user.name,
    email: backendUser?.email ?? session.user.email,
    image: backendUser?.avatarUrl ?? session.user.image,
  };

  return (
    <SessionProvider session={session} basePath="/api/nextauth">
      <div className="flex h-dvh flex-col overflow-hidden bg-neutral-100 md:flex-row">
        <Sidebar role={backendUser?.role} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar user={freshUser} role={backendUser?.role} />
          <DashboardMotion className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6 lg:p-7">
            {children}
          </DashboardMotion>
        </div>
      </div>
    </SessionProvider>
  );
}
