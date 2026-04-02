"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="
        min-h-11 rounded-xl border border-[#2D3A4B]
        bg-[#1B222D] px-3 py-2 text-sm font-medium text-white sm:px-4
        hover:bg-[#212B38] hover:border-[#5EE287] hover:text-[#CFFFE0]
        transition-all duration-300
      "
    >
      Login
    </button>
  );
}
