"use client";

import Link from "next/link";

export default function BackButton({
  href = "/",
  label = "← Zurück"
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="
  inline-block mb-6 px-4 py-2 rounded-lg
  bg-[#1A1F23] text-white
  hover:bg-[#242B31]
  transition-colors border border-[#2E353C]
"

    >
      {label}
    </Link>
  );
}
