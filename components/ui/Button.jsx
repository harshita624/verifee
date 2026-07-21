import { cn } from "@/lib/utils";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  loading,
  onClick,
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 select-none cursor-pointer";

  const variants = {
    primary:
      "bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md active:scale-[0.98]",
    secondary:
      "bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-200 hover:border-zinc-300 shadow-sm active:scale-[0.98]",
    ghost:
      "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-900",
    danger:
      "bg-red-600 hover:bg-red-700 text-white shadow-sm active:scale-[0.98]",
    outline:
      "border border-green-600 text-green-700 hover:bg-green-50 active:scale-[0.98]",
  };

  const sizes = {
    sm: "text-[13px] px-3 py-1.5 gap-1.5",
    md: "text-[14px] px-4 py-2.5 gap-2",
    lg: "text-[15px] px-6 py-3 gap-2",
    xl: "text-[16px] px-8 py-3.5 gap-2.5",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {loading && (
        <span
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          style={{ animation: "spin 0.7s linear infinite" }}
        />
      )}
      {children}
    </button>
  );
}