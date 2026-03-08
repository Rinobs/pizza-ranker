"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiGrid, FiUser, FiSearch } from "react-icons/fi";
import { useState, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import LoginButton from "./LoginButton";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const { data: session } = useSession();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (query.trim().length === 0) {
      router.push("/");
      return;
    }

    router.push(`/?q=${encodeURIComponent(query.trim())}`);
  };

  const navItemClass = (active: boolean) =>
    `flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
      active
        ? "bg-[#1B222D] border border-[#2D3A4B] text-white"
        : "text-[#B7C4D3] hover:text-white hover:bg-[#1B222D]/70"
    }`;

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#101722]/80 border-b border-[#233042]/80 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl">{"\u{1F355}"}</span>
          <span className="text-xl font-semibold tracking-wide text-white group-hover:text-[#8AF5AC] transition-colors select-none">
            FoodRanker
          </span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-2 bg-[#141C27] border border-[#2D3A4B] rounded-xl px-3 py-2 focus-within:border-[#5EE287] transition-colors"
        >
          <FiSearch className="text-[#8CA1B8]" />
          <input
            type="text"
            placeholder="Produkte und Kategorien suchen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent outline-none border-none text-sm text-white w-full placeholder:text-[#6E8198]"
          />
        </form>

        <div className="flex items-center gap-2 text-sm font-medium">
          <Link href="/" className={navItemClass(pathname === "/")}>
            <FiHome size={18} />
            <span className="hidden md:inline">Home</span>
          </Link>

          <Link
            href="/kategorien"
            className={navItemClass(Boolean(pathname?.startsWith("/kategorien")))}
          >
            <FiGrid size={18} />
            <span className="hidden md:inline">Kategorien</span>
          </Link>

          {session ? (
            <button
              onClick={() => signOut()}
              className="px-4 py-2 rounded-xl bg-[#1B222D] border border-[#2D3A4B] text-white hover:bg-[#212B38] hover:border-[#5EE287] transition-all duration-300"
            >
              Logout
            </button>
          ) : (
            <LoginButton />
          )}

          {session && (
            <span className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-[#1B222D] border border-[#2D3A4B] text-white">
              <FiUser size={18} />
            </span>
          )}
        </div>
      </nav>
    </header>
  );
}