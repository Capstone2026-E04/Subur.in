import { IconType } from "react-icons";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconType;
  iconBg?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconBg = "bg-primary",
  trend,
}: StatCardProps) {
  return (
    <Card className="flex-row items-center gap-4 p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="text-primary text-xl leading-tight font-semibold">
          {value}
        </p>
        {trend && (
          <p
            className={`mt-0.5 text-xs font-medium ${
              trend.positive ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {trend.positive ? "▲" : "▼"} {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}
