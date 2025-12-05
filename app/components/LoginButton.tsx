"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("google")}
      className="
        px-3 py-1.5 rounded-lg
        bg-[#4CAF50] text-white font-medium
        hover:bg-[#43a046] transition
      "
    >
      Login
    </button>
  );
}
