"use client";

import { FiHeart } from "react-icons/fi";

export default function ReviewLikeButton({
  active,
  count,
  disabled,
  compact = false,
  onClick,
}: {
  active: boolean;
  count: number;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const label = count === 1 ? "1 Like" : `${count} Likes`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-[#FF8AA7] bg-[#2D1821] text-[#FFDCE7]"
          : "border-[#2D3A4B] bg-[#141C27] text-[#D6E2EF] hover:border-[#FF8AA7]/45"
      } ${compact ? "px-2.5 py-1.5 text-xs" : ""}`}
      aria-pressed={active}
    >
      <FiHeart className={active ? "fill-current" : ""} size={compact ? 14 : 16} />
      <span>{label}</span>
    </button>
  );
}
