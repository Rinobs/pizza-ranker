"use client";

import { createClient } from "@supabase/supabase-js";

export default function LoginButton() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <button
      onClick={handleLogin}
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
