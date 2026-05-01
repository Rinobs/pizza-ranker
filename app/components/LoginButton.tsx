"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="
        min-h-11 rounded-xl border border-[#333333]
        bg-[#2A2A2A] px-3 py-2 text-sm font-medium text-white sm:px-4
        hover:bg-[#2A2A2A] hover:border-[#E8750A] hover:text-[#CFFFE0]
        transition-all duration-300
      "
    >
      Login
    </button>
  );
}
