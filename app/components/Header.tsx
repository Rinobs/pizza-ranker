"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiHome, FiGrid, FiUser, FiSearch } from "react-icons/fi";
import { useEffect, useState, FormEvent } from "react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState("");

  // URL-Query in Input spiegeln (z.B. ?q=pizza)
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams.toString());

    if (query.trim()) {
      params.set("q", query.trim());
    } else {
      params.delete("q");
    }

    // immer auf die Startseite navigieren mit ?q=
    router.push(`/?${params.toString()}`);
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

        {/* Suche im Header */}
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

          <Link
            href="/login"
            className="
              px-3 py-1.5 rounded-lg
              bg-[#4CAF50] text-white font-medium
              hover:bg-[#43a046] transition
            "
          >
            Login
          </Link>

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
