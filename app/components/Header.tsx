"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiGrid, FiUser, FiSearch, FiChevronDown } from "react-icons/fi";
import { useState, FormEvent, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import LoginButton from "./LoginButton";

type CategoryLink = {
  name: string;
  icon: string;
  href: string;
  description: string;
};

const CATEGORY_LINKS: CategoryLink[] = [
  {
    name: "Tiefkuehlpizza",
    icon: "\u{1F355}",
    href: "/pizza",
    description: "Pizza-Rankings & Bewertungen",
  },
  {
    name: "Chips",
    icon: "\u{1F35F}",
    href: "/chips",
    description: "Crunchy Favoriten vergleichen",
  },
  {
    name: "Eis",
    icon: "\u{1F366}",
    href: "/eis",
    description: "Sorten entdecken und bewerten",
  },
  {
    name: "Proteinpulver",
    icon: "\u{1F4AA}",
    href: "/proteinpulver",
    description: "Makros, Geschmack, Preis",
  },
  {
    name: "Proteinriegel",
    icon: "\u{1F36B}",
    href: "/proteinriegel",
    description: "Snacks mit Score",
  },
];

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const categoriesWrapperRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();

  const isCategoryRoute = CATEGORY_LINKS.some((category) =>
    Boolean(pathname?.startsWith(category.href))
  );
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!categoriesWrapperRef.current) return;
      if (categoriesWrapperRef.current.contains(event.target as Node)) return;
      setIsCategoriesOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCategoriesOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <nav className="h-20 flex items-center justify-between gap-4">
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

            <div ref={categoriesWrapperRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((prev) => !prev)}
                aria-expanded={isCategoriesOpen}
                aria-controls="categories-flyout"
                className={navItemClass(isCategoryRoute || isCategoriesOpen)}
              >
                <FiGrid size={18} />
                <span className="hidden md:inline">Kategorien</span>
                <FiChevronDown
                  size={16}
                  className={`transition-transform duration-300 ${
                    isCategoriesOpen ? "rotate-180" : "rotate-0"
                  }`}
                />
              </button>

              <div
                className={`
                  absolute right-0 mt-3 w-[92vw] max-w-[860px]
                  transition-all duration-300 ease-out
                  ${
                    isCategoriesOpen
                      ? "opacity-100 translate-y-0 pointer-events-auto"
                      : "opacity-0 -translate-y-2 pointer-events-none"
                  }
                `}
              >
                <div
                  id="categories-flyout"
                  className="rounded-2xl border border-[#2D3A4B] bg-[#151F2B]/98 backdrop-blur-xl p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
                >
                  <div className="mb-3 px-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
                      Schnellzugriff
                    </p>
                    <h3 className="text-base font-semibold text-[#E8F6ED]">
                      Kategorien entdecken
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {CATEGORY_LINKS.map((category) => {
                      const isActive = Boolean(pathname?.startsWith(category.href));

                      return (
                        <Link
                          key={category.href}
                          href={category.href}
                          onClick={() => setIsCategoriesOpen(false)}
                          className={`
                            group rounded-xl border px-3 py-3 transition-all duration-300
                            ${
                              isActive
                                ? "border-[#5EE287] bg-[#1E2A3A]"
                                : "border-[#2D3A4B] bg-[#121B27] hover:border-[#5EE287] hover:bg-[#1B2736]"
                            }
                          `}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl leading-none">{category.icon}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-white group-hover:text-[#8AF5AC] transition-colors">
                                {category.name}
                              </p>
                              <p className="text-xs text-[#8CA1B8] mt-1 leading-relaxed">
                                {category.description}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

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
      </div>
    </header>
  );
}
