type BuyButtonProps = {
  href: string;
  sourceLabel: string;
  productName?: string;
  compact?: boolean;
  className?: string;
};

export default function BuyButton({
  href,
  sourceLabel,
  productName,
  compact = false,
  className = "",
}: BuyButtonProps) {
  const sizeClasses = compact
    ? "gap-2 px-3 py-2 text-[11px] sm:text-xs"
    : "gap-2.5 px-4 py-2.5 text-sm sm:text-[15px]";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={
        productName
          ? `${productName} extern öffnen bei ${sourceLabel}`
          : `Produkt extern öffnen bei ${sourceLabel}`
      }
      className={`inline-flex items-center justify-center rounded-full border border-[#E8750A]/45 bg-[linear-gradient(135deg,rgba(26,14,4,0.96),rgba(14,14,14,0.98))] font-semibold text-[#FFF0E4] shadow-[0_12px_28px_rgba(232,117,10,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#F5963C] hover:text-white ${sizeClasses} ${className}`}
    >
      <span>Kaufen</span>
      <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#CFFFE0]">
        {sourceLabel}
      </span>
    </a>
  );
}
