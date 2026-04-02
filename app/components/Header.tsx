"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  FiHome,
  FiGrid,
  FiUser,
  FiSearch,
  FiChevronDown,
  FiSliders,
  FiX,
  FiLogOut,
} from "react-icons/fi";
import { useState, type FormEvent, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSession, signOut } from "next-auth/react";
import LoginButton from "./LoginButton";
import MobileBarcodeScanner from "./MobileBarcodeScanner";
import {
  CATEGORY_NAV_ITEMS,
  DEFAULT_DISCOVER_SORT,
  DISCOVER_SORT_OPTIONS,
  getDiscoverQuickSearchTags,
  isCategoryFilter,
  isDiscoverSortMode,
  type DiscoverSortMode,
} from "@/lib/product-navigation";

function getChipClass(active: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
    active
      ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6] shadow-[0_10px_24px_rgba(34,197,94,0.16)]"
      : "border-[#2D3A4B] bg-[#141C27] text-[#B7C4D3] hover:border-[#5EE287] hover:text-white"
  }`;
}

type DiscoverUpdates = {
  q?: string | null;
  category?: string | null;
  sort?: DiscoverSortMode | null;
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") || "").trim();
  const rawCategory = searchParams.get("category");
  const rawSort = searchParams.get("sort");
  const selectedCategory = isCategoryFilter(rawCategory) ? rawCategory : "all";
  const sortMode = isDiscoverSortMode(rawSort) ? rawSort : DEFAULT_DISCOVER_SORT;
  const activeFilterCount =
    Number(selectedCategory !== "all") + Number(sortMode !== DEFAULT_DISCOVER_SORT);
  const sortLabel =
    DISCOVER_SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Beliebt";
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState(urlQuery);
  const categoriesWrapperRef = useRef<HTMLDivElement | null>(null);
  const discoverWrapperRef = useRef<HTMLDivElement | null>(null);
  const mobileSheetRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();

  const currentCategoryRoute =
    CATEGORY_NAV_ITEMS.find((category) => Boolean(pathname?.startsWith(category.href))) ?? null;
  const quickSearchTags = getDiscoverQuickSearchTags(currentCategoryRoute?.slug);
  const isCategoryRoute = Boolean(currentCategoryRoute);
  const isProfileRoute = pathname === "/profil";

  const closeCategories = () => setIsCategoriesOpen(false);
  const closeDiscover = () => setIsDiscoverOpen(false);
  const closeOverlays = useCallback(() => {
    setIsCategoriesOpen(false);
    setIsDiscoverOpen(false);
  }, []);

  useEffect(() => {
    setDiscoverQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    closeOverlays();
  }, [closeOverlays, pathname]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (categoriesWrapperRef.current?.contains(target)) return;
      if (discoverWrapperRef.current?.contains(target)) return;
      if (mobileSheetRef.current?.contains(target)) return;

      closeOverlays();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeOverlays();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeOverlays]);

  useEffect(() => {
    if (!(isCategoriesOpen || isDiscoverOpen)) return;
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCategoriesOpen, isDiscoverOpen]);

  function buildDiscoverUrl(updates: DiscoverUpdates) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      const nextQuery = updates.q?.trim();
      if (nextQuery) {
        nextParams.set("q", nextQuery);
      } else {
        nextParams.delete("q");
      }
    }

    if (updates.category !== undefined) {
      if (updates.category && updates.category !== "all") {
        nextParams.set("category", updates.category);
      } else {
        nextParams.delete("category");
      }
    }

    if (updates.sort !== undefined) {
      if (updates.sort && updates.sort !== DEFAULT_DISCOVER_SORT) {
        nextParams.set("sort", updates.sort);
      } else {
        nextParams.delete("sort");
      }
    }

    const queryString = nextParams.toString();
    return queryString ? `/?${queryString}` : "/";
  }

  function navigateDiscover(
    updates: DiscoverUpdates,
    options?: {
      closeDiscover?: boolean;
      closeCategories?: boolean;
      replace?: boolean;
    }
  ) {
    const href = buildDiscoverUrl(updates);
    const shouldReplace = options?.replace ?? pathname === "/";

    if (shouldReplace) {
      router.replace(href, { scroll: false });
    } else {
      router.push(href, { scroll: false });
    }

    if (options?.closeDiscover) {
      closeDiscover();
    }
    if (options?.closeCategories) {
      closeCategories();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateDiscover(
      { q: discoverQuery || null },
      { closeCategories: true, closeDiscover: true }
    );
  }

  function resetDiscover() {
    setDiscoverQuery("");
    navigateDiscover(
      {
        q: null,
        category: null,
        sort: DEFAULT_DISCOVER_SORT,
      },
      { closeCategories: true, closeDiscover: true }
    );
  }

  function applyQuickSearchTag(
    tag: string,
    options?: {
      closeDiscover?: boolean;
      closeCategories?: boolean;
    }
  ) {
    setDiscoverQuery(tag);

    navigateDiscover(
      currentCategoryRoute
        ? {
            q: tag,
            category: currentCategoryRoute.slug,
          }
        : {
            q: tag,
          },
      {
        closeCategories: options?.closeCategories,
        closeDiscover: options?.closeDiscover,
        replace: pathname === "/",
      }
    );
  }

  const navItemClass = (active: boolean) =>
    `min-h-11 shrink-0 touch-manipulation flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm transition-all duration-300 sm:gap-2 sm:px-3 ${
      active
        ? "bg-[#1B222D] border border-[#2D3A4B] text-white"
        : "text-[#B7C4D3] hover:text-white hover:bg-[#1B222D]/70"
    }`;

  const discoverPanel = (
    <div
      className={`
        absolute left-0 top-full mt-3 hidden md:block w-[min(92vw,820px)]
        transition-all duration-300 ease-out
        ${
          isDiscoverOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        }
      `}
    >
      <div className="rounded-2xl border border-[#2D3A4B] bg-[#151F2B]/98 backdrop-blur-xl p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
              Filter & Sortierung
            </p>
            <h3 className="mt-2 text-xl font-semibold text-[#E8F6ED]">
              Suche und Navigation zusammen steuern
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-[#B7C4D3] leading-relaxed">
              Passe deinen Produkt-Feed direkt hier im Header an und springe danach sofort in die Ergebnisse.
            </p>
          </div>

          <button
            type="button"
            onClick={resetDiscover}
            className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287]"
          >
            Alles zurücksetzen
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
            Schnellsuche
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickSearchTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => applyQuickSearchTag(tag, { closeDiscover: true })}
                className="rounded-full border border-[#2D3A4B] bg-[#141C27]/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#BFD0E2] transition-colors hover:border-[#5EE287] hover:text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
            Kategorien filtern
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigateDiscover({ category: null }, { replace: pathname === "/" })}
              className={getChipClass(selectedCategory === "all")}
            >
              Alle
            </button>
            {CATEGORY_NAV_ITEMS.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() =>
                  navigateDiscover(
                    {
                      category: selectedCategory === category.slug ? null : category.slug,
                    },
                    { replace: pathname === "/" }
                  )
                }
                className={getChipClass(selectedCategory === category.slug)}
              >
                <span className="mr-2">{category.icon}</span>
                {category.shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
            Sortieren nach
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DISCOVER_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  navigateDiscover({ sort: option.value }, { replace: pathname === "/" })
                }
                className={getChipClass(sortMode === option.value)}
                title={option.hint}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#8CA1B8]">
            Aktuell sortiert nach <span className="text-[#E8F6ED]">{sortLabel}</span>.
          </p>
        </div>
      </div>
    </div>
  );

  const mobilePanel = (
    <div
      className={`
        md:hidden fixed inset-0 z-[120]
        transition-opacity duration-300
        ${
          isCategoriesOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }
      `}
    >
      <button
        type="button"
        aria-label="Entdecken schließen"
        onClick={closeCategories}
        className="absolute inset-0 bg-[#0A111A]/65 backdrop-blur-[2px]"
      />

      <div
        ref={mobileSheetRef}
        className={`
          absolute left-0 right-0 bottom-0
          rounded-t-3xl border-t border-[#2D3A4B]
          bg-[#141E2A] px-4 pb-6 pt-3
          shadow-[0_-18px_40px_rgba(0,0,0,0.45)]
          transition-transform duration-300 ease-out
          ${isCategoriesOpen ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[#3B4A5E]" />

        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
              Suche, Filter & Kategorien
            </p>
            <h3 className="text-lg font-semibold text-[#E8F6ED]">
              Im Header entdecken
            </h3>
          </div>

          <button
            type="button"
            onClick={closeCategories}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#2D3A4B] bg-[#121B27] text-white"
            aria-label="Schließen"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[#2D3A4B] bg-[#101822]/90 px-4 py-3 focus-within:border-[#5EE287] transition-colors">
            <FiSearch className="text-[#8CA1B8]" />
            <input
              type="text"
              name="q"
              value={discoverQuery}
              onChange={(event) => setDiscoverQuery(event.target.value)}
              placeholder="Produkte und Kategorien suchen..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6E8198]"
            />
            <MobileBarcodeScanner
              ariaLabel="Barcode in der Suche scannen"
              className="h-9 w-9 rounded-lg"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="min-h-11 flex-1 rounded-2xl bg-[#5EE287] px-5 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
            >
              Ergebnisse ansehen
            </button>
            <button
              type="button"
              onClick={resetDiscover}
              className="min-h-11 rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 font-semibold text-white transition-colors hover:border-[#5EE287]"
            >
              Reset
            </button>
          </div>
        </form>

        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
            Beliebte Suchen
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quickSearchTags.map((tag) => (
              <button
                key={`mobile-${tag}`}
                type="button"
                onClick={() => applyQuickSearchTag(tag, { closeCategories: true })}
                className="rounded-full border border-[#2D3A4B] bg-[#141C27]/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#BFD0E2] transition-colors hover:border-[#5EE287] hover:text-white"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-[#2D3A4B] bg-[#111925]/90 p-5 max-h-[58vh] overflow-y-auto">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
              Kategorien filtern
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigateDiscover({ category: null })}
                className={getChipClass(selectedCategory === "all")}
              >
                Alle
              </button>
              {CATEGORY_NAV_ITEMS.map((category) => (
                <button
                  key={`filter-${category.slug}`}
                  type="button"
                  onClick={() =>
                    navigateDiscover({
                      category: selectedCategory === category.slug ? null : category.slug,
                    })
                  }
                  className={getChipClass(selectedCategory === category.slug)}
                >
                  <span className="mr-2">{category.icon}</span>
                  {category.shortName}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
              Sortieren nach
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DISCOVER_SORT_OPTIONS.map((option) => (
                <button
                  key={`sort-${option.value}`}
                  type="button"
                  onClick={() => navigateDiscover({ sort: option.value })}
                  className={getChipClass(sortMode === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-[#8CA1B8]">
              Aktuell sortiert nach <span className="text-[#E8F6ED]">{sortLabel}</span>.
            </p>
          </div>

          <div className="mt-7 border-t border-[#223247] pt-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
              Direkt zu Kategorien
            </p>
            <div className="mt-3 space-y-2.5 pr-1">
              {CATEGORY_NAV_ITEMS.map((category) => {
                const isActive = Boolean(pathname?.startsWith(category.href));

                return (
                  <Link
                    key={`mobile-${category.href}`}
                    href={category.href}
                    onClick={closeCategories}
                    className={`
                      flex cursor-pointer items-center gap-3 rounded-xl border border-l-[3px] px-3 py-3 transition-[background-color] duration-150 ease-[ease]
                      ${
                        isActive
                          ? "border-[#2D3A4B] border-l-[#5EE287] bg-[#2A2A2A] hover:bg-[#343434]"
                          : "border-[#2D3A4B] border-l-transparent bg-[#121B27] hover:bg-[#252F3B]"
                      }
                    `}
                  >
                    <span className="text-2xl leading-none">{category.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{category.name}</p>
                      <p className="text-xs text-[#8CA1B8] mt-0.5">{category.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 w-full overflow-x-clip border-b border-[#233042]/80 bg-[#101722]/80 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-md">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <nav className="flex h-16 items-center justify-between gap-3 sm:h-20 sm:gap-4">
            <Link href="/" onClick={closeOverlays} className="group flex shrink-0 items-center gap-3">
              <span className="text-2xl">{"\u{1F355}"}</span>
              <span className="hidden sm:inline text-xl font-semibold tracking-wide text-white group-hover:text-[#8AF5AC] transition-colors select-none">
                FoodRanker
              </span>
            </Link>

            <div ref={discoverWrapperRef} className="relative hidden md:flex items-center gap-2 flex-1 max-w-2xl mx-2">
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 flex-1 bg-[#141C27] border border-[#2D3A4B] rounded-xl px-3 py-2 focus-within:border-[#5EE287] transition-colors"
              >
                <FiSearch className="text-[#8CA1B8]" />
                <input
                  type="text"
                  name="q"
                  value={discoverQuery}
                  onChange={(event) => setDiscoverQuery(event.target.value)}
                  placeholder="Produkte und Kategorien suchen..."
                  className="bg-transparent outline-none border-none text-sm text-white w-full placeholder:text-[#6E8198]"
                />
                <button
                  type="submit"
                  className="min-h-10 rounded-lg bg-[#5EE287] px-3 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
                >
                  Suchen
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  closeCategories();
                  setIsDiscoverOpen((previous) => !previous);
                }}
                aria-expanded={isDiscoverOpen}
                className={`relative min-h-11 touch-manipulation inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                  isDiscoverOpen || activeFilterCount > 0
                    ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6]"
                    : "border-[#2D3A4B] bg-[#141C27] text-white hover:border-[#5EE287]"
                }`}
              >
                <FiSliders size={17} />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5EE287] px-1 text-[10px] font-bold leading-none text-[#0C1910]">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {discoverPanel}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-sm font-medium sm:flex-none sm:gap-2">
              <Link
                href="/"
                onClick={closeOverlays}
                className={`${navItemClass(pathname === "/")} hidden sm:flex`}
              >
                <FiHome size={18} />
                <span className="hidden md:inline">Home</span>
              </Link>

              <div ref={categoriesWrapperRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    closeDiscover();
                    setIsCategoriesOpen((previous) => !previous);
                  }}
                  aria-expanded={isCategoriesOpen}
                  aria-controls="categories-flyout"
                  aria-label="Entdecken"
                  className={navItemClass(isCategoryRoute || isCategoriesOpen)}
                >
                  <FiGrid size={18} />
                  <span className="hidden sm:inline">Entdecken</span>
                  <FiChevronDown
                    size={16}
                    className={`transition-transform duration-300 ${
                      isCategoriesOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                <div
                  className={`
                    hidden md:block
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
                      {CATEGORY_NAV_ITEMS.map((category) => {
                        const isActive = Boolean(pathname?.startsWith(category.href));

                        return (
                          <Link
                            key={category.href}
                            href={category.href}
                            onClick={closeCategories}
                            className={`
                              group cursor-pointer rounded-xl border border-l-[3px] px-3 py-3 transition-[background-color] duration-150 ease-[ease]
                              ${
                                isActive
                                  ? "border-[#2D3A4B] border-l-[#5EE287] bg-[#2A2A2A] hover:bg-[#343434]"
                                  : "border-[#2D3A4B] border-l-transparent bg-[#121B27] hover:bg-[#252F3B]"
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
                  onClick={() => {
                    closeOverlays();
                    signOut();
                  }}
                  aria-label="Logout"
                  className="min-h-11 shrink-0 touch-manipulation rounded-xl border border-[#2D3A4B] bg-[#1B222D] px-2.5 py-2 text-sm text-white transition-all duration-300 hover:border-[#5EE287] hover:bg-[#212B38] sm:px-4"
                >
                  <span className="inline-flex items-center gap-2">
                    <FiLogOut size={17} />
                    <span className="hidden sm:inline">Logout</span>
                  </span>
                </button>
              ) : (
                <LoginButton />
              )}

              <Link
                href="/profil"
                onClick={closeOverlays}
                aria-label="Profil"
                className={`${navItemClass(isProfileRoute)} px-3`}
              >
                <FiUser size={18} />
                <span className="hidden md:inline">Profil</span>
              </Link>
            </div>
          </nav>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 pb-3 md:hidden"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#2D3A4B] bg-[#141C27] px-3 py-2.5 focus-within:border-[#5EE287] transition-colors">
              <FiSearch className="shrink-0 text-[#8CA1B8]" />
              <input
                type="text"
                name="q"
                value={discoverQuery}
                onChange={(event) => setDiscoverQuery(event.target.value)}
                placeholder="Produkte suchen..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#6E8198]"
              />
              <MobileBarcodeScanner
                ariaLabel="Barcode in der Suche scannen"
                className="h-9 w-9 rounded-lg"
              />
            </div>

            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-xl bg-[#5EE287] px-3.5 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
            >
              Suchen
            </button>
          </form>
        </div>
      </header>

      {typeof window !== "undefined" ? createPortal(mobilePanel, document.body) : null}
    </>
  );
}




