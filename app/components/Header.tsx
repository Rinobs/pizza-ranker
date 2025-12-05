"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiGrid, FiUser, FiSearch } from "react-icons/fi";
import { useState, FormEvent } from "react";
import LoginButton from "./LoginButton";


export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (query.trim().length === 0) {
      router.push("/");
      return;
    }

    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header
      className="
        sticky top-0 z-50 w-full
        backdrop-blur-md bg-[#1a1d21]/80 
        border-b border-white/10 shadow-lg
      "
    >
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">🍕</span>
          <span
            className="
              text-xl font-semibold tracking-wide text-white
              group-hover:text-[#4CAF50] transition-colors select-none
            "
          >
            FoodRanker
          </span>
        </Link>

        {/* Suche ohne useSearchParams */}
        <form
          onSubmit={handleSubmit}
          className="
            hidden sm:flex items-center gap-2
            flex-1 max-w-md mx-4
            bg-[#14181C] border border-[#2A3238]
            rounded-lg px-3 py-1.5
          "
        >
          <FiSearch className="text-gray-400" />
          <input
            type="text"
            placeholder="Produkte & Kategorien suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="
              bg-transparent outline-none border-none
              text-sm text-white w-full
              placeholder:text-gray-500
            "
          />
        </form>

        {/* Navigation rechts */}
        <div className="flex items-center gap-4 text-gray-300 text-sm font-medium">
          
          <Link
            href="/"
            className={`flex items-center gap-1 hover:text-white transition ${
              pathname === "/" ? "text-white" : ""
            }`}
          >
            <FiHome size={18} />
            <span className="hidden md:inline">Home</span>
          </Link>

          <Link
            href="/kategorien"
            className={`flex items-center gap-1 hover:text-white transition ${
              pathname?.startsWith("/kategorien") ? "text-white" : ""
            }`}
          >
            <FiGrid size={18} />
            <span className="hidden md:inline">Kategorien</span>
          </Link>

          {/* ⭐ Login Button oben */}
        <LoginButton />
      

          <button
            className="
              hidden sm:flex items-center justify-center
              text-gray-300 hover:text-white transition
            "
          >
            <FiUser size={20} />
          </button>
        </div>
      </nav>
    </header>
  );
}
