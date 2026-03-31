"use client";

import React from "react";
import Link from "next/link";
import { FiChevronDown } from "react-icons/fi";
import BackButton from "../components/BackButton";
import ProductCardImage from "../components/ProductCardImage";
import ProductComparisonPanel, {
  COMPARE_LIMIT,
  type ComparableProduct,
} from "../components/ProductComparisonPanel";
import {
  getProductImageUrl,
  getProductPriceValue,
  getProductRouteSlug,
  type Product,
} from "@/app/data/products";
import {
  compareByDiscoverSort,
  getProductSearchScore,
} from "@/lib/product-navigation";

type RatingStat = {
  ratingAvg: number | null;
  ratingCount: number;
};

type RatingSummaryResponse = {
  success?: boolean;
  stats?: Record<string, RatingStat>;
};

type CategoryProduct = ComparableProduct & {
  newIndex: number;
  priceValue: number | null;
};

type VisibleProduct = CategoryProduct & {
  searchScore: number;
};

type CategorySortMode = "best" | "price" | "new" | "name";

const SORT_OPTIONS: Array<{ value: CategorySortMode; label: string; hint: string }> = [
  {
    value: "best",
    label: "Bewertung",
    hint: "Höchste Bewertung zuerst",
  },
  {
    value: "price",
    label: "Preis",
    hint: "Günstigste zuerst",
  },
  {
    value: "new",
    label: "Neueste",
    hint: "Zuletzt hinzugefügt zuerst",
  },
  {
    value: "name",
    label: "A-Z",
    hint: "Alphabetisch sortiert",
  },
];

function getCompareChipClass(active: boolean, disabled: boolean) {
  if (active) {
    return "border-[#5EE287] bg-[#173023]/95 text-[#D9FFE6] shadow-[0_10px_24px_rgba(34,197,94,0.18)]";
  }

  if (disabled) {
    return "cursor-not-allowed border-[#384658] bg-[#111923]/95 text-[#70839A]";
  }

  return "border-[#2D3A4B] bg-[#111923]/95 text-[#E8F6ED] hover:border-[#5EE287] hover:text-white";
}

function compareByCategorySort(
  left: CategoryProduct,
  right: CategoryProduct,
  sortMode: CategorySortMode
) {
  if (sortMode === "name") {
    const byName = left.name.localeCompare(right.name, "de");
    if (byName !== 0) {
      return byName;
    }

    return compareByDiscoverSort(left, right, "best");
  }

  return compareByDiscoverSort(left, right, sortMode);
}

export default function CategoryPage({
  title,
  icon,
  products,
}: {
  title: string;
  icon: string;
  products: Product[];
}) {
  const [sortMode, setSortMode] = React.useState<CategorySortMode>("best");
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [ratingStats, setRatingStats] = React.useState<Record<string, RatingStat>>({});
  const [statsLoaded, setStatsLoaded] = React.useState(false);
  const [selectedRouteSlugs, setSelectedRouteSlugs] = React.useState<string[]>([]);
  const activeSearchQuery = deferredSearchQuery.trim();

  React.useEffect(() => {
    let cancelled = false;

    async function loadRatingStats() {
      try {
        const response = await fetch("/api/ratings/summary", {
          cache: "no-store",
        });

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

  React.useEffect(() => {
    const availableRouteSlugs = new Set(products.map((item) => getProductRouteSlug(item)));

    setSelectedRouteSlugs((current) => {
      const next = current.filter((slug) => availableRouteSlugs.has(slug));
      return next.length === current.length ? current : next;
    });
  }, [products]);

  const categoryProducts = React.useMemo(() => {
    return products.map((item, index) => {
      const routeSlug = getProductRouteSlug(item);
      const stats = ratingStats[routeSlug];
      return {
        item,
        name: item.name,
        routeSlug,
        originalImageUrl: getProductImageUrl(item),
        ratingAvg: stats?.ratingAvg ?? null,
        ratingCount: stats?.ratingCount ?? 0,
        newIndex: index,
        priceValue: getProductPriceValue(item),
      };
    });
  }, [products, ratingStats]);

  const visibleProducts = React.useMemo(() => {
    const result: VisibleProduct[] = [];

    for (const product of categoryProducts) {
      const score = activeSearchQuery ? getProductSearchScore(product.item, activeSearchQuery) : 0;

      if (activeSearchQuery && score <= 0) {
        continue;
      }

      result.push({
        ...product,
        searchScore: score,
      });
    }

    result.sort((left, right) => {
      const sortedByMode = compareByCategorySort(left, right, sortMode);
      if (sortedByMode !== 0) {
        return sortedByMode;
      }

      if (activeSearchQuery && left.searchScore !== right.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return 0;
    });

    return result;
  }, [activeSearchQuery, categoryProducts, sortMode]);

  const comparedProducts = React.useMemo(() => {
    const productByRouteSlug = new Map(
      categoryProducts.map((product) => [product.routeSlug, product] as const)
    );

    return selectedRouteSlugs
      .map((routeSlug) => productByRouteSlug.get(routeSlug))
      .filter((product): product is CategoryProduct => Boolean(product));
  }, [categoryProducts, selectedRouteSlugs]);

  const selectedRouteSlugSet = React.useMemo(() => {
    return new Set(selectedRouteSlugs);
  }, [selectedRouteSlugs]);

  const activeSort = SORT_OPTIONS.find((option) => option.value === sortMode);
  const compareLimitReached = selectedRouteSlugs.length >= COMPARE_LIMIT;

  function toggleCompareSelection(routeSlug: string) {
    setSelectedRouteSlugs((current) => {
      if (current.includes(routeSlug)) {
        return current.filter((slug) => slug !== routeSlug);
      }

      if (current.length >= COMPARE_LIMIT) {
        return current;
      }

      return [...current, routeSlug];
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="flex items-center gap-4 mb-10">
        <span className="text-6xl">{icon}</span>
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#E8F6ED]">
            {title}
          </h1>
          <p className="mt-2 text-[#B7C4D3] text-sm sm:text-base">
            Suche innerhalb der Kategorie, sortiere direkt auf der Seite und stelle Produkte
            nebeneinander.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-[28px] border border-[#2D3A4B] bg-[linear-gradient(135deg,rgba(21,31,43,0.96),rgba(14,20,30,0.98))] p-5 sm:p-6 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
        <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">
          Suche in {title}
        </p>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={`In ${title} suchen, z. B. Salami oder Vanille`}
          className="mt-3 min-h-12 w-full rounded-2xl border border-[#2D3A4B] bg-[#101822]/90 px-4 text-white outline-none transition-colors placeholder:text-[#70839A] focus:border-[#5EE287]"
        />
        <p className="mt-3 text-sm text-[#8CA1B8]">
          Suche nach Produktnamen, Marken oder typischen Begriffen. Die Sortierung findest du
          direkt über den Kacheln per Dropdown.
        </p>
      </section>

      {!statsLoaded && <p className="text-[#8CA1B8] text-center mb-8">Lade Bewertungen...</p>}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5 text-[#BFD0E2]">
            {visibleProducts.length} Produkte
          </span>
          <span className="rounded-full border border-[#35506D] bg-[#122233] px-3 py-1.5 text-[#D9ECFF]">
            Vergleich {comparedProducts.length}/{COMPARE_LIMIT}
          </span>
          {activeSearchQuery && (
            <span className="rounded-full border border-[#3F5C7A] bg-[#122233] px-3 py-1.5 text-[#D9ECFF]">
              Suche aktiv
            </span>
          )}
          {comparedProducts.length >= 2 && (
            <span className="rounded-full border border-[#2D5C3D] bg-[#102116] px-3 py-1.5 text-[#BFF2CF]">
              Direktvergleich bereit
            </span>
          )}
          {compareLimitReached && (
            <span className="rounded-full border border-[#5A4630] bg-[#2C2115] px-3 py-1.5 text-[#F5D69A]">
              Maximal {COMPARE_LIMIT} Produkte gleichzeitig
            </span>
          )}
        </div>

        <div className="w-full max-w-[240px]">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8CA1B8]">
            Sortieren
          </label>
          <div className="relative mt-2">
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as CategorySortMode)}
              aria-label="Produkte sortieren"
              className="min-h-11 w-full appearance-none rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 pr-11 text-sm font-semibold text-white outline-none transition-colors focus:border-[#5EE287]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <FiChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8CA1B8]"
            />
          </div>
          <p className="mt-2 text-xs text-[#8CA1B8]">
            {activeSort?.hint ?? "Sortierung aktiv"}
          </p>
        </div>
      </div>

      <ProductComparisonPanel
        title={title}
        products={comparedProducts}
        limit={COMPARE_LIMIT}
        onRemove={toggleCompareSelection}
        onClear={() => setSelectedRouteSlugs([])}
      />

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
          {visibleProducts.map((product, index) => {
            const isSelectedForCompare = selectedRouteSlugSet.has(product.routeSlug);
            const compareDisabled = compareLimitReached && !isSelectedForCompare;

            return (
              <div
                key={product.routeSlug}
                className="
                group relative rounded-2xl overflow-hidden
                bg-[#1B222D] border border-[#2D3A4B]
                shadow-[0_8px_24px_rgba(0,0,0,0.24)]
                hover:border-[#5EE287]
                hover:shadow-[0_16px_40px_rgba(34,197,94,0.28)]
                hover:-translate-y-1.5 hover:scale-[1.02]
                transition-all duration-300 ease-out
              "
                style={{ aspectRatio: "3 / 4" }}
              >
                <button
                  type="button"
                  onClick={() => toggleCompareSelection(product.routeSlug)}
                  disabled={compareDisabled}
                  aria-pressed={isSelectedForCompare}
                  className={`absolute right-3 top-3 z-20 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all duration-200 ${getCompareChipClass(
                    isSelectedForCompare,
                    compareDisabled
                  )}`}
                >
                  {isSelectedForCompare
                    ? "Ausgewählt"
                    : compareDisabled
                      ? "Vergleich voll"
                      : "Vergleichen"}
                </button>

                <Link
                  href={`/produkt/${product.routeSlug}`}
                  aria-label={`${product.item.name} öffnen`}
                  className="absolute inset-0 z-10 block h-full w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AF5AC] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101822]"
                />

                <ProductCardImage
                  routeSlug={product.routeSlug}
                  alt={product.item.name}
                  fallbackSrc={product.originalImageUrl}
                  eager={index < 3}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-95 transition-opacity group-hover:opacity-100" />

                <div className="absolute bottom-0 left-0 z-20 w-full p-4 pointer-events-none">
                  <h3 className="text-white text-sm sm:text-base font-semibold line-clamp-2">
                    {product.item.name}
                  </h3>

                  {product.ratingAvg !== null && product.ratingCount > 0 ? (
                    <p className="mt-1.5 text-xs font-semibold text-yellow-300 sm:text-sm">
                      {product.ratingAvg.toFixed(1)} / 5
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 text-[#C4D0DE]">
          Keine Treffer gefunden. Versuche einen anderen Suchbegriff oder wechsle die Sortierung.
        </div>
      )}
    </div>
  );
}
