"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MdDeveloperMode } from "react-icons/md";
import { Card } from "@/components/ui/card";
import { fetchDevMode, setDevMode } from "@/services/devModeService";

export default function DeveloperModeControl() {
  const { data: session } = useSession();
  const token = session?.user?.backendToken ?? "";
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchDevMode(token)
      .then(setEnabled)
      .catch((e) => setError(e.message));
  }, [token]);

  const handleToggle = async (next: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      setEnabled(await setDevMode(token, next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah Dev Mode.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
            <MdDeveloperMode size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">
              Developer Mode
            </p>
            <p className="text-[10px] text-neutral-400 sm:text-xs">
              Aktifkan simulasi data sensor menggunakan Developer Mode yang
              tersedia pada sistem.
            </p>
          </div>
        </div>
        <label
          htmlFor="dev-mode-toggle"
          className="relative inline-flex shrink-0 cursor-pointer items-center"
        >
          <input
            id="dev-mode-toggle"
            type="checkbox"
            checked={enabled}
            disabled={isLoading || !token}
            onChange={(e) => handleToggle(e.target.checked)}
            className="peer sr-only"
          />
          <div className="peer peer-checked:bg-primary h-5 w-9 rounded-full bg-neutral-200 peer-focus:outline-none peer-disabled:opacity-60 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
        </label>
      </div>
      {error && (
        <p className="text-xs font-semibold text-rose-600">⚠ {error}</p>
      )}
    </Card>
  );
}
