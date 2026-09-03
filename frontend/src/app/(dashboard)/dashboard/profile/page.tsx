import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MdEmail, MdCalendarMonth } from "react-icons/md";
import EditNameForm from "@/components/dashboard/EditNameForm";
import { API_URL } from "@/services/api";

interface BackendUser {
  name?: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}

async function fetchUserProfile(backendToken: string): Promise<BackendUser | null> {
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

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const backendToken = session.user.backendToken;

  const backendUser = backendToken
    ? await fetchUserProfile(backendToken)
    : null;

  const name = backendUser?.name ?? session.user.name;
  const email = backendUser?.email ?? session.user.email;
  const image = backendUser?.avatarUrl ?? session.user.image;
  const createdAt = backendUser?.createdAt
    ? new Date(backendUser.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "-";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-xl bg-white border border-black/5 shadow-sm p-6 flex items-center gap-5">
        <div className="h-16 w-16 shrink-0 rounded-full overflow-hidden bg-primary shadow-sm">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={name || "Avatar"}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white text-2xl font-bold">
              {name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-800 truncate">
            {name ?? "Pengguna"}
          </p>
          <p className="text-sm text-gray-400 truncate">{email}</p>
        </div>
      </div>

      {/* Detail informasi */}
      <div className="rounded-xl bg-white border border-black/5 shadow-sm p-5 space-y-5">
        <h2 className="text-sm font-semibold text-primary">Informasi Akun</h2>

        {/* Nama — bisa diedit */}
        <EditNameForm
          currentName={name ?? ""}
          backendToken={backendToken}
        />

        {/* Email — read-only */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Alamat Email
          </label>
          <div className="flex items-center gap-2.5 rounded-lg border border-black/8 bg-gray-50 px-4 py-2.5">
            <MdEmail size={16} className="text-primary/60 shrink-0" />
            <span className="text-sm text-gray-500">{email ?? "-"}</span>
            <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
              Tidak dapat diubah
            </span>
          </div>
        </div>

        {/* Tanggal bergabung */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Bergabung Sejak
          </label>
          <div className="flex items-center gap-2.5 rounded-lg border border-black/8 bg-gray-50 px-4 py-2.5">
            <MdCalendarMonth size={16} className="text-primary/60 shrink-0" />
            <span className="text-sm text-gray-500">{createdAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
