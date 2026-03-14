"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  href = "/",
  label = "\u2190 Zur\u00FCck",
}: {
  href?: string;
  label?: string;
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
      className="
        inline-flex items-center gap-2 mb-8 px-5 py-2.5 rounded-xl
        bg-[#1B222D] text-[#E8EDF5] border border-[#2D3A4B]
        shadow-[0_8px_20px_rgba(0,0,0,0.22)]
        hover:bg-[#212B38] hover:border-[#5EE287] hover:text-white
        hover:-translate-y-0.5 transition-all duration-300
      "
    >
      {label}
    </button>
  );
}
