import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { categoryLabel } from "./categoryLabel";
import ApplicationGuide from "./ApplicationGuide";
import type { DeviceRecommendation } from "@/types/device";

export default function TreatmentCards({
  recommendation,
  loading,
  message,
  error,
  deviceName,
  onRefresh,
}: {
  recommendation: DeviceRecommendation | null;
  loading: boolean;
  message: string;
  error: string | null;
  deviceName: string;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="py-3">
          <h1 className="text-primary text-base font-bold">
            Rekomendasi Treatment
          </h1>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">{deviceName}</p>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="text-primary min-h-10 text-xs font-semibold disabled:opacity-50"
            >
              Perbarui
            </button>
          </div>
          {loading ? (
            <p role="status" className="text-sm text-neutral-500">
              Memuat rekomendasi...
            </p>
          ) : error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : recommendation ? (
            <>
              <p className="text-primary text-sm font-semibold">
                {categoryLabel(recommendation.categoryCode)}
              </p>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-3 text-xs">
                <p>
                  Kelembapan media{" "}
                  <strong className="mt-1 block text-base">
                    {recommendation.moistureValue.toLocaleString("id-ID")} % VWC
                  </strong>
                </p>
                <p>
                  pH media{" "}
                  <strong className="mt-1 block text-base">
                    {recommendation.phValue.toLocaleString("id-ID")}
                  </strong>
                </p>
              </div>
              <h2 className="text-sm font-semibold">
                Kondisi dan tindakan yang disarankan
              </h2>
              <p className="text-sm leading-relaxed text-neutral-600">
                {recommendation.actionText}
              </p>
              {recommendation.timestamp && (
                <p className="text-xs text-neutral-400">
                  Diperbarui{" "}
                  {new Date(recommendation.timestamp).toLocaleString("id-ID")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">
              {message ||
                "Rekomendasi belum tersedia. Tunggu pembacaan sensor perangkat ini."}
            </p>
          )}
        </CardContent>
      </Card>
      <ApplicationGuide recommendation={recommendation} />
    </div>
  );
}
