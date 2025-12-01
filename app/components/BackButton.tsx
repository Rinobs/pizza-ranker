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
        bg-gray-100 text-gray-700
        hover:bg-gray-200 transition border shadow-sm
      "
    >
      {label}
    </Link>
  );
}
