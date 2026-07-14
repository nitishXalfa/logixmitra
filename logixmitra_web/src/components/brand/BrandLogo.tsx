/** LogixMitra brand mark */
const BrandLogo = ({
  compact = false,
  iconOnly = false,
  variant = "dark",
}: {
  compact?: boolean;
  iconOnly?: boolean;
  variant?: "dark" | "light";
}) => {
  const onDarkBg = variant === "light";

  const iconBox = (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_rgba(14,116,144,0.35)]"
      style={{
        background: "linear-gradient(145deg, #1e3a5f 0%, #0e7490 100%)",
      }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L21 7v10l-9 5-9-5V7l9-5z" />
        <path d="M12 12l9-5M12 12v10M12 12L3 7" opacity="0.6" />
      </svg>
    </div>
  );

  if (iconOnly || compact) {
    return iconBox;
  }

  return (
    <div className="flex items-center gap-2.5">
      {iconBox}
      <div className="leading-tight min-w-0">
        <span className={`block text-[15px] font-bold tracking-tight truncate ${onDarkBg ? "text-white" : "text-slate-900"}`}>
          LogixMitra
        </span>
        <span className={`block text-[10px] font-medium tracking-wide uppercase ${onDarkBg ? "text-white/70" : "text-slate-400"}`}>
          Logistics Console
        </span>
      </div>
    </div>
  );
};

export default BrandLogo;
