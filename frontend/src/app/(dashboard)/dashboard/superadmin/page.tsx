import SuperadminPanel from "@/components/superadmin/SuperadminPanel";
import { requireSuperadmin } from "@/lib/requireSuperadmin";

export const dynamic = "force-dynamic";

export default async function SuperadminPage() {
  await requireSuperadmin();

  return <SuperadminPanel />;
}
