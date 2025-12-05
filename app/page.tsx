"use client";

import { Suspense } from "react";
import HomeContent from "./home-content";

export default function Home() {
  return (
    <Suspense fallback={<div className="text-white p-10">Lädt…</div>}>
      <HomeContent />
    </Suspense>
  );
}
