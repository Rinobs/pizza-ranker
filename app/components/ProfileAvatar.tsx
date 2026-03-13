"use client";

import Image from "next/image";
import { FiCamera } from "react-icons/fi";
import { getProfileInitials } from "@/lib/profile-features";

type ProfileAvatarProps = {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
};

const SIZE_CLASS_NAMES: Record<NonNullable<ProfileAvatarProps["size"]>, string> = {
  sm: "h-14 w-14 text-sm",
  md: "h-20 w-20 text-lg",
  lg: "h-28 w-28 text-2xl",
  xl: "h-36 w-36 text-3xl",
};

export default function ProfileAvatar({
  src,
  name,
  size = "lg",
  onAction,
  actionLabel = "Profilbild aendern",
  className = "",
}: ProfileAvatarProps) {
  const sizeClassName = SIZE_CLASS_NAMES[size];
  const initials = getProfileInitials(name);

  return (
    <div
      className={`group relative overflow-hidden rounded-[28px] border border-[#35503D] bg-[radial-gradient(circle_at_top,rgba(94,226,135,0.32),rgba(20,28,39,0.94)_58%)] shadow-[0_18px_42px_rgba(0,0,0,0.34)] ${sizeClassName} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={`${name} Profilbild`}
          fill
          sizes="(max-width: 768px) 144px, 192px"
          unoptimized
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(94,226,135,0.22),rgba(59,90,120,0.28))] font-black tracking-[0.12em] text-white">
          {initials}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10" />

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="absolute inset-0 flex items-end justify-center bg-black/0 p-3 text-white opacity-0 transition-all duration-300 group-hover:bg-black/35 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
          aria-label={actionLabel}
          title={actionLabel}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#111925]/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]">
            <FiCamera size={14} />
            {actionLabel}
          </span>
        </button>
      )}
    </div>
  );
}
