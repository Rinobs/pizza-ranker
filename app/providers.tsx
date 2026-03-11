"use client";

import { SessionProvider } from "next-auth/react";
import UsernameSetupGate from "@/app/components/UsernameSetupGate";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UsernameSetupGate />
      {children}
    </SessionProvider>
  );
}
