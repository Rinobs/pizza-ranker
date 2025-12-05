import Link from "next/link";
import { FiHome, FiGrid, FiUser } from "react-icons/fi";
import { Suspense } from "react";
import HeaderSearch from "./HeaderSearch";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

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

        {/* Suche — jetzt in Suspense */}
        <Suspense fallback={<div className="text-gray-500 hidden sm:block">…</div>}>
          <HeaderSearch />
        </Suspense>

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
