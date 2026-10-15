"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdChevronLeft,
  MdChevronRight,
  MdUnfoldMore,
} from "react-icons/md";
import { Card } from "@/components/ui/card";
import {
  fetchSuperadminDeviceOptions,
  fetchSuperadminOverview,
  fetchSuperadminResource,
  type DeviceOption,
  type PageMeta,
  type SuperadminResource,
  type SuperadminRow,
} from "@/services/superadminService";
import SuperadminSensorCharts from "./SuperadminSensorCharts";
import { TABS, type CellFormat } from "./superadminTabs";

type SortState = { by: string; order: "asc" | "desc" } | null;

const SEARCH_DEBOUNCE_MS = 400;

const CONTROL_CLASS =
  "focus:ring-primary/30 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-neutral-900 focus:ring-2 focus:outline-none";

function readPath(row: SuperadminRow, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object") {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, row);
}

function formatCell(value: unknown, format: CellFormat = "text"): string {
  if (value === null || value === undefined || value === "") return "-";
  if (format === "bool") return value ? "Ya" : "Tidak";
  if (format === "date") {
    return new Date(String(value)).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });
  }
  if (format === "number" && typeof value === "number") {
    return String(Math.round(value * 100) / 100);
  }
  return String(value);
}

export default function SuperadminPanel() {
  const { data: session } = useSession();
  const token = session?.user?.backendToken ?? "";

  const [activeKey, setActiveKey] = useState<SuperadminResource>("users");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [deviceFilter, setDeviceFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [items, setItems] = useState<SuperadminRow[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTab = TABS.find((tab) => tab.key === activeKey) ?? TABS[0];
  const hasActiveFilters =
    Boolean(search || deviceFilter || from || to) ||
    Object.values(filters).some(Boolean);

  useEffect(() => {
    if (!token) return;
    fetchSuperadminOverview(token)
      .then(setOverview)
      .catch(() => setOverview({}));
    fetchSuperadminDeviceOptions(token)
      .then(setDevices)
      .catch(() => setDevices([]));
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchSuperadminResource(token, activeKey, {
        page,
        sortBy: sort?.by,
        order: sort?.order,
        search,
        filters: { ...filters, deviceId: deviceFilter },
        from,
        to,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setItems([]);
      setMeta(null);
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [token, activeKey, page, sort, search, filters, deviceFilter, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setFilters({});
    setDeviceFilter("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const selectTab = (key: SuperadminResource) => {
    resetFilters();
    setSort(null);
    setActiveKey(key);
  };

  const toggleSort = (path: string) => {
    setPage(1);
    setSort((current) => {
      if (current?.by !== path) return { by: path, order: "asc" };
      if (current.order === "asc") return { by: path, order: "desc" };
      return null;
    });
  };

  const changeFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div data-reveal>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Superadmin
        </h1>
        <p className="mt-1 text-base text-neutral-800">
          Seluruh data yang tersimpan di database.
        </p>
      </div>

      <SuperadminSensorCharts token={token} devices={devices} />

      <section className="space-y-4" aria-label="Tabel data">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => selectTab(tab.key)}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-primary border-primary text-white"
                    : "border-black/10 bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {tab.label}
                {overview[tab.key] !== undefined && (
                  <span className="ml-2 tabular-nums opacity-70">
                    {overview[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-medium text-neutral-600">
            Cari
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={activeTab.searchPlaceholder}
              maxLength={100}
              className={CONTROL_CLASS}
            />
          </label>

          {activeTab.filterByDevice && (
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Perangkat
              <select
                value={deviceFilter}
                onChange={(e) => {
                  setPage(1);
                  setDeviceFilter(e.target.value);
                }}
                className={`${CONTROL_CLASS} max-w-[220px] cursor-pointer`}
              >
                <option value="">Semua</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.label} · {device.user.email}
                  </option>
                ))}
              </select>
            </label>
          )}

          {activeTab.filters.map((filter) => (
            <label
              key={filter.key}
              className="flex flex-col gap-1 text-xs font-medium text-neutral-600"
            >
              {filter.label}
              <select
                value={filters[filter.key] ?? ""}
                onChange={(e) => changeFilter(filter.key, e.target.value)}
                className={`${CONTROL_CLASS} cursor-pointer`}
              >
                <option value="">Semua</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}

          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Dari tanggal
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              className={CONTROL_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Sampai tanggal
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              className={CONTROL_CLASS}
            />
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="cursor-pointer rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        <Card className="overflow-hidden rounded-3xl">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-rose-600">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="text-primary mt-3 cursor-pointer text-xs font-bold hover:underline"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <div
              className={`overflow-x-auto ${isLoading && items.length > 0 ? "opacity-60" : ""}`}
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
                  <tr>
                    {activeTab.columns.map((column) => {
                      const direction =
                        sort?.by === column.path ? sort.order : null;
                      return (
                        <th
                          key={column.path}
                          scope="col"
                          aria-sort={
                            direction === "asc"
                              ? "ascending"
                              : direction === "desc"
                                ? "descending"
                                : undefined
                          }
                          className="px-4 py-3 whitespace-nowrap"
                        >
                          {column.sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(column.path)}
                              className="hover:text-primary flex cursor-pointer items-center gap-1 uppercase"
                            >
                              {column.header}
                              {direction === "asc" ? (
                                <MdArrowUpward size={14} />
                              ) : direction === "desc" ? (
                                <MdArrowDownward size={14} />
                              ) : (
                                <MdUnfoldMore
                                  size={14}
                                  className="opacity-40"
                                />
                              )}
                            </button>
                          ) : (
                            column.header
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {isLoading && items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTab.columns.length}
                        className="px-4 py-10 text-center text-neutral-400"
                      >
                        Memuat data...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td
                        colSpan={activeTab.columns.length}
                        className="px-4 py-10 text-center text-neutral-400"
                      >
                        Tidak ada data.
                      </td>
                    </tr>
                  ) : (
                    items.map((row, index) => (
                      <tr
                        key={String(row.id ?? index)}
                        className="hover:bg-neutral-50"
                      >
                        {activeTab.columns.map((column) => {
                          const text = formatCell(
                            readPath(row, column.path),
                            column.format,
                          );
                          return (
                            <td
                              key={column.path}
                              className="max-w-xs truncate px-4 py-3 text-neutral-800"
                              title={text}
                            >
                              {text}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {meta && (
            <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 text-sm text-neutral-700">
              <span>
                Halaman {meta.page} dari {meta.totalPages} · {meta.total} data
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  disabled={meta.page <= 1 || isLoading}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MdChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  disabled={meta.page >= meta.totalPages || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-black/10 bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MdChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
