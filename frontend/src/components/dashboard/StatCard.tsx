import { IconType } from "react-icons";

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
    <div className="flex items-center gap-4 rounded-xl bg-white p-5 shadow-sm border border-black/5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-semibold text-primary leading-tight">{value}</p>
        {trend && (
          <p
            className={`text-xs font-medium mt-0.5 ${
              trend.positive ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {trend.positive ? "▲" : "▼"} {trend.value}
          </p>
        )}
      </div>
    </div>
  );
}
