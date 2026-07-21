import { cn } from "@/lib/utils";

const variants = {
  green: "bg-green-100 text-green-700 border border-green-200",
  red: "bg-red-50 text-red-700 border border-red-100",
  yellow: "bg-amber-50 text-amber-700 border border-amber-100",
  blue: "bg-blue-50 text-blue-700 border border-blue-100",
  purple: "bg-purple-50 text-purple-700 border border-purple-100",
  zinc: "bg-zinc-100 text-zinc-600 border border-zinc-200",
  black: "bg-zinc-900 text-white border border-zinc-800",
};

export default function Badge({ children, variant = "green", className = "" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}