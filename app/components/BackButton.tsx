"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  href = "/",
  label = "\u2190 Zur\u00FCck",
  className = "mb-8",
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(href);
      }}
      className={`
        inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
        bg-[#2A2A2A] text-[#EDE0D4] border border-[#333333]
        shadow-[0_8px_20px_rgba(0,0,0,0.22)]
        hover:bg-[#2A2A2A] hover:border-[#E8750A] hover:text-white
        hover:-translate-y-0.5 transition-all duration-300
        ${className}
      `}
    >
      {label}
    </button>
  );
}
