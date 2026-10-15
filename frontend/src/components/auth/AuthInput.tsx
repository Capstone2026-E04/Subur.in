import type { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function AuthInput({ label, id, ...props }: AuthInputProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-gray-700">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className="focus:border-primary focus:ring-primary/20 min-h-11 w-full rounded-xl border border-black/10 bg-white px-4 text-sm text-gray-800 shadow-sm transition focus:ring-2 focus:outline-none disabled:opacity-60"
      />
    </div>
  );
}
