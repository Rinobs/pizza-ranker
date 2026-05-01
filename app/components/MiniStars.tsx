type Props = {
  rating: number;
  count?: number;
  size?: "xs" | "sm";
};

export default function MiniStars({ rating, count, size = "sm" }: Props) {
  const starSize = size === "xs" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, rating - i));
          return (
            <span key={i} className={`relative shrink-0 ${starSize}`}>
              <svg className="absolute inset-0 text-[#3A3A3A]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
              {fill > 0 && (
                <span className="absolute inset-y-0 left-0 overflow-hidden text-[#F6C85C]" style={{ width: `${fill * 100}%` }}>
                  <svg className={starSize} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </span>
      <span className="text-[11px] font-semibold text-[#FFD86C]">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-[10px] text-[#8CA1B8]">({count})</span>
      )}
    </span>
  );
}
