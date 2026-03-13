"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  ALL_PRODUCTS,
  PIZZA_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
} from "./data/products";
import {
  CATEGORY_NAV_ITEMS,
  DEFAULT_DISCOVER_SORT,
  compareByDiscoverSort,
  getCategoryNavigationItem,
  getProductSearchScore,
  isCategoryFilter,
  isDiscoverSortMode,
  type DiscoverSortMode,
} from "@/lib/product-navigation";

type RankedProduct = {
  name: string;
  category: string;
  routeSlug: string;
  imageUrl: string;
  ratingAvg: number | null;
  ratingCount: number;
  weekRatingAvg: number | null;
  weekRatingCount: number;
};

type BrowseProduct = RankedProduct & {
  newIndex: number;
  searchScore: number;
};

type HomeSectionsResponse = {
  topPizza: RankedProduct[];
  newlyAdded: RankedProduct[];
  trending: RankedProduct[];
  bestThisWeek: RankedProduct[];
  hasLiveRatings: boolean;
  generatedAt: string;
};

type RatingSummaryResponse = {
  success?: boolean;
  stats?: Record<
    string,
    {
      ratingAvg: number | null;
      ratingCount: number;
    }
  >;
};

const SORT_OPTIONS: Array<{ value: DiscoverSortMode; label: string; hint: string }> = [
  {
    value: "popular",
    label: "Beliebt",
    hint: "Meiste Bewertungen zuerst",
  },
  {
    value: "best",
    label: "Beste",
    hint: "Hoechste Bewertung zuerst",
  },
  {
    value: "new",
    label: "Neu",
    hint: "Zuletzt hinzugefuegt zuerst",
  },
];

const QUICK_SEARCH_TAGS = ["Salami", "Vanille", "Schokolade", "Margherita", "Protein"];

function toRankedProduct(product: Product): RankedProduct {
  return {
    name: product.name,
    category: product.category,
    routeSlug: getProductRouteSlug(product),
    imageUrl: getProductImageUrl(product),
    ratingAvg: null,
    ratingCount: 0,
    weekRatingAvg: null,
    weekRatingCount: 0,
  };
}

function fallbackSections(): HomeSectionsResponse {
  const topPizza = PIZZA_PRODUCTS.slice(0, 10).map(toRankedProduct);
  const newlyAdded = ALL_PRODUCTS.slice(-10).reverse().map(toRankedProduct);
  const trending = ALL_PRODUCTS.slice(0, 10).map(toRankedProduct);
  const bestThisWeek = topPizza;

  return {
    topPizza,
    newlyAdded,
    trending,
    bestThisWeek,
    hasLiveRatings: false,
    generatedAt: new Date().toISOString(),
  };
}

function ProductCard({ product }: { product: RankedProduct }) {
  return (
    <Link
      href={`/produkt/${product.routeSlug}`}
      className="
        group relative rounded-2xl overflow-hidden cursor-pointer
        bg-[#1B222D] border border-[#2D3A4B]
        shadow-[0_8px_24px_rgba(0,0,0,0.24)]
        hover:border-[#5EE287]
        hover:shadow-[0_16px_40px_rgba(34,197,94,0.28)]
        hover:-translate-y-1.5 hover:scale-[1.02]
        transition-all duration-300 ease-out
      "
      style={{ aspectRatio: "3/4" }}
    >
      <img
        src={`/api/product-image/${product.routeSlug}`}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        onError={(event) => {
          const image = event.currentTarget;
          if (image.dataset.fallbackApplied === "1") {
            image.src = "/images/placeholders/product-default.svg";
            return;
          }
          image.dataset.fallbackApplied = "1";
          image.src = product.imageUrl;
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />

      <div className="absolute bottom-0 left-0 w-full p-4">
        <h3 className="text-sm sm:text-base font-semibold text-white drop-shadow-md line-clamp-2">
          {product.name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-200">{product.category}</p>
        {product.ratingAvg !== null ? (
          <p className="text-xs sm:text-sm text-yellow-300 mt-1.5">
            {"\u2B50"} {product.ratingAvg.toFixed(1)} ({product.ratingCount})
          </p>
        ) : (
          <p className="text-xs sm:text-sm text-[#BFD0E2] mt-1.5">Noch keine Bewertungen</p>
        )}
      </div>
    </Link>
  );
}

function ProductSection({
  title,
  products,
}: {
  title: string;
  products: RankedProduct[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="mb-16">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 tracking-tight text-[#E8F6ED]">
        {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
        {products.map((product) => (
          <ProductCard key={`${title}-${product.routeSlug}`} product={product} />
        ))}
      </div>
    </section>
  );
}

function getChipClass(active: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
    active
      ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6] shadow-[0_10px_24px_rgba(34,197,94,0.16)]"
      : "border-[#2D3A4B] bg-[#141C27] text-[#B7C4D3] hover:border-[#5EE287] hover:text-white"
  }`;
}

export default function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").trim();
  const rawCategory = searchParams.get("category");
  const rawSort = searchParams.get("sort");
  const selectedCategory = isCategoryFilter(rawCategory) ? rawCategory : "all";
  const sortMode: DiscoverSortMode = isDiscoverSortMode(rawSort)
    ? rawSort
    : DEFAULT_DISCOVER_SORT;
  const hasActiveFilters =
    selectedCategory !== "all" || sortMode !== DEFAULT_DISCOVER_SORT;
  const isSearchMode = searchQuery.length > 0 || hasActiveFilters;

  const fallback = useMemo(() => fallbackSections(), []);
  const [sections, setSections] = useState<HomeSectionsResponse>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingStats, setRatingStats] = useState<
    Record<string, { ratingAvg: number | null; ratingCount: number }>
  >({});
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [toolbarQuery, setToolbarQuery] = useState(searchQuery);
  const [searchUIOpen, setSearchUIOpen] = useState(isSearchMode);
  const [showFilters, setShowFilters] = useState(hasActiveFilters);

  useEffect(() => {
    setToolbarQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    if (isSearchMode) {
      setSearchUIOpen(true);
    }
  }, [isSearchMode]);

  useEffect(() => {
    if (hasActiveFilters) {
      setShowFilters(true);
    }
  }, [hasActiveFilters]);

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      try {
        const response = await fetch("/api/home/sections", { cache: "no-store" });
        if (!response.ok) return;

        const json = (await response.json()) as Partial<HomeSectionsResponse>;
        if (cancelled) return;

        setSections({
          topPizza: json.topPizza ?? fallback.topPizza,
          newlyAdded: json.newlyAdded ?? fallback.newlyAdded,
          trending: json.trending ?? fallback.trending,
          bestThisWeek: json.bestThisWeek ?? fallback.bestThisWeek,
          hasLiveRatings:
            typeof json.hasLiveRatings === "boolean"
              ? json.hasLiveRatings
              : fallback.hasLiveRatings,
          generatedAt:
            typeof json.generatedAt === "string" ? json.generatedAt : fallback.generatedAt,
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadSections();

    return () => {
      cancelled = true;
    };
  }, [fallback]);

  useEffect(() => {
    let cancelled = false;

    async function loadRatingStats() {
      try {
        const response = await fetch("/api/ratings/summary", { cache: "no-store" });
        if (!response.ok) return;

        const json = (await response.json()) as RatingSummaryResponse;
        if (cancelled) return;

        setRatingStats(json.stats ?? {});
      } finally {
        if (!cancelled) setStatsLoaded(true);
      }
    }

    void loadRatingStats();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateHomeFilters(updates: {
    q?: string | null;
    category?: string | null;
    sort?: DiscoverSortMode | null;
  }) {
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
    router.replace(queryString ? `/?${queryString}` : "/", { scroll: false });
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateHomeFilters({ q: toolbarQuery || null });
  }

  function closeSearchMode() {
    setToolbarQuery("");
    setShowFilters(false);
    setSearchUIOpen(false);
    updateHomeFilters({
      q: null,
      category: null,
      sort: DEFAULT_DISCOVER_SORT,
    });
  }

  const browseProducts = useMemo(() => {
    const items: BrowseProduct[] = [];

    for (const [index, product] of ALL_PRODUCTS.entries()) {
      if (selectedCategory !== "all" && product.slug !== selectedCategory) {
        continue;
      }

      const routeSlug = getProductRouteSlug(product);
      const base = toRankedProduct(product);
      const stats = ratingStats[routeSlug];
      const searchScore = searchQuery ? getProductSearchScore(product, searchQuery) : 0;

      if (searchQuery && searchScore <= 0) {
        continue;
      }

      items.push({
        ...base,
        ratingAvg: stats?.ratingAvg ?? null,
        ratingCount: stats?.ratingCount ?? 0,
        newIndex: index,
        searchScore,
      });
    }

    items.sort((left, right) => {
      if (searchQuery && left.searchScore !== right.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return compareByDiscoverSort(left, right, sortMode);
    });

    return items;
  }, [ratingStats, searchQuery, selectedCategory, sortMode]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label ?? "Beliebt";
  const activeCategory =
    selectedCategory === "all" ? null : getCategoryNavigationItem(selectedCategory);
  const filtersVisible = searchUIOpen && (showFilters || hasActiveFilters);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F141A] via-[#121A24] to-[#0F141A] text-white px-4 sm:px-8 lg:px-12 pb-24 pt-28">
      <div className="text-center pb-14">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
          FoodRanker
        </h1>
        <p className="text-[#B7C4D3] mt-3 text-base sm:text-lg">
          Finde und bewerte deine Lieblingsprodukte.
        </p>

        {!searchUIOpen && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setSearchUIOpen(true)}
              className="rounded-full border border-[#5EE287] bg-[#173023] px-5 py-3 text-sm font-semibold text-[#D9FFE6] transition-colors hover:bg-[#21402E]"
            >
              Suchen
            </button>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        {searchUIOpen && (
          <section className="mb-14 rounded-[28px] border border-[#2D3A4B] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.14),rgba(20,28,39,0.96)_38%),linear-gradient(135deg,rgba(19,28,40,0.95),rgba(14,20,30,0.98))] p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.28)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">
                  Suche
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#F3FFF6]">
                  Produkte gezielt finden
                </h2>
                <p className="mt-3 max-w-2xl text-sm sm:text-base text-[#C4D0DE] leading-relaxed">
                  Starte eine Suche und oeffne bei Bedarf die Filter fuer Kategorien und Sortierung.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters((previous) => !previous)}
                  className={getChipClass(filtersVisible)}
                >
                  {filtersVisible ? "Filter ausblenden" : "Filter"}
                </button>
                <button
                  type="button"
                  onClick={closeSearchMode}
                  className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287]"
                >
                  Schliessen
                </button>
              </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={toolbarQuery}
                onChange={(event) => setToolbarQuery(event.target.value)}
                placeholder="Zum Beispiel: Salami, Vanille, Pizza oder Protein"
                className="min-h-12 flex-1 rounded-2xl border border-[#2D3A4B] bg-[#101822]/90 px-4 text-white outline-none transition-colors placeholder:text-[#70839A] focus:border-[#5EE287]"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="min-h-12 rounded-2xl bg-[#5EE287] px-5 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
                >
                  Suchen
                </button>
                {(isSearchMode || toolbarQuery.length > 0) && (
                  <button
                    type="button"
                    onClick={closeSearchMode}
                    className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-5 font-semibold text-white transition-colors hover:border-[#5EE287]"
                  >
                    Zur Startseite
                  </button>
                )}
              </div>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setToolbarQuery(tag);
                    updateHomeFilters({ q: tag });
                  }}
                  className="rounded-full border border-[#2D3A4B] bg-[#141C27]/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#BFD0E2] transition-colors hover:border-[#5EE287] hover:text-white"
                >
                  {tag}
                </button>
              ))}
            </div>

            {filtersVisible && (
              <div className="mt-6 rounded-3xl border border-[#2D3A4B] bg-[#111925]/90 p-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
                    Kategorien
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateHomeFilters({ category: null })}
                      className={getChipClass(selectedCategory === "all")}
                    >
                      Alle
                    </button>
                    {CATEGORY_NAV_ITEMS.map((category) => (
                      <button
                        key={category.slug}
                        type="button"
                        onClick={() =>
                          updateHomeFilters({
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
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateHomeFilters({ sort: option.value })}
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
              </div>
            )}
          </section>
        )}

        {isSearchMode ? (
          <section className="mb-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">
                  Ergebnisse
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#E8F6ED]">
                  {searchQuery ? `Treffer fuer \"${searchQuery}\"` : "Gefilterte Produkte"}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-[#B7C4D3]">
                  {activeCategory
                    ? `${activeCategory.name} gefiltert, sortiert nach ${sortLabel}.`
                    : `Alle Produkte, sortiert nach ${sortLabel}.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5 text-[#BFD0E2]">
                  {browseProducts.length} Treffer
                </span>
                {activeCategory && (
                  <span className="rounded-full border border-[#5EE287]/35 bg-[#173023] px-3 py-1.5 text-[#CFFFE0]">
                    {activeCategory.shortName}
                  </span>
                )}
                {searchQuery && (
                  <span className="rounded-full border border-[#3F5C7A] bg-[#122233] px-3 py-1.5 text-[#D9ECFF]">
                    Suche aktiv
                  </span>
                )}
              </div>
            </div>

            {!statsLoaded && (
              <p className="mb-4 text-sm text-[#8CA1B8]">Bewertungen fuer Sortierung werden geladen...</p>
            )}

            {browseProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
                {browseProducts.map((product) => (
                  <ProductCard key={`browse-${product.routeSlug}`} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 text-[#C4D0DE]">
                Keine Treffer gefunden. Versuche andere Begriffe wie Pizza, Salami, Vanille oder
                waehle eine andere Kategorie.
              </div>
            )}
          </section>
        ) : (
          <>
            <ProductSection
              title={"\u{1F525} Top 10 Tiefkuehlpizzen"}
              products={sections.topPizza}
            />
            <ProductSection
              title={"\u{1F195} Neu hinzugefuegt"}
              products={sections.newlyAdded}
            />
            <ProductSection
              title={"\u{1F4C8} Trendende Produkte"}
              products={sections.trending}
            />
            <ProductSection
              title={"\u2B50 Beste Bewertung diese Woche"}
              products={sections.bestThisWeek}
            />

            <section className="mt-20">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 tracking-tight text-[#E8F6ED]">
                Kategorien entdecken
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-7">
                {CATEGORY_NAV_ITEMS.map((category) => (
                  <Link
                    key={category.slug}
                    href={category.href}
                    className="
                      group relative p-7 rounded-2xl
                      bg-[#1B222D] border border-[#2D3A4B]
                      hover:border-[#5EE287] hover:bg-[#212B38]
                      shadow-[0_8px_24px_rgba(0,0,0,0.24)] hover:shadow-[0_16px_34px_rgba(34,197,94,0.22)]
                      hover:-translate-y-1 transition-all duration-300
                      flex flex-col items-center justify-center text-center cursor-pointer
                    "
                  >
                    <div className="text-5xl mb-5 transition-transform duration-300 group-hover:scale-110">
                      {category.icon}
                    </div>
                    <h3 className="text-xl font-semibold tracking-wide text-white group-hover:text-[#8AF5AC] transition-colors duration-300">
                      {category.shortName}
                    </h3>
                    <p className="mt-2 text-sm text-[#8CA1B8]">{category.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="text-xs text-[#8CA1B8] mt-10 text-center">
          {isSearchMode
            ? `${browseProducts.length} Produkte passen aktuell zu deiner Suche oder deinen Filtern.`
            : isLoading
              ? "Lade Highlights..."
              : sections.hasLiveRatings
                ? "Highlights basieren auf vorhandenen Bewertungen."
                : "Es sind noch zu wenige Live-Bewertungen vorhanden. Zeige Standard-Highlights."}
        </p>
      </div>
    </main>
  );
}