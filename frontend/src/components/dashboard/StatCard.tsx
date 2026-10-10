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
    <Card className="hover:border-primary/25 flex-row items-center gap-4 p-5 transition-all duration-300 hover:-translate-y-0.5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-gray-500">{label}</p>
        <p className="text-primary truncate text-lg leading-tight font-semibold">
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
