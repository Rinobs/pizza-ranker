"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="
        px-4 py-2 rounded-xl
        bg-[#1B222D] text-white font-medium border border-[#2D3A4B]
        hover:bg-[#212B38] hover:border-[#5EE287] hover:text-[#CFFFE0]
        transition-all duration-300
      "
    >
      Login
    </button>
  );
}