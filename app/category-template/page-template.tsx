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
  DEFAULT_PRODUCT_IMAGE,
  getProductImageUrl,
  getProductPriceValue,
  getProductRouteSlug,
  type Product,
} from "@/app/data/products";
import {
  compareByDiscoverSort,
  getProductSearchScore,
  type CategoryNavigationItem,
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
  hasImage: boolean;
  newIndex: number;
  priceValue: number | null;
};

type VisibleProduct = CategoryProduct & {
  searchScore: number;
};

type CategoryPageProduct = Product & {
  routeSlug?: string;
};

type CategoryProductsResponse = {
  success?: boolean;
  data?: CategoryPageProduct[];
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
  categorySlug,
  products,
}: {
  title: string;
  icon: string;
  categorySlug: CategoryNavigationItem["slug"];
  products: CategoryPageProduct[];
}) {
  const [sortMode, setSortMode] = React.useState<CategorySortMode>("best");
  const [searchQuery, setSearchQuery] = React.useState("");
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [ratingStats, setRatingStats] = React.useState<Record<string, RatingStat>>({});
  const [statsLoaded, setStatsLoaded] = React.useState(false);
  const [selectedRouteSlugs, setSelectedRouteSlugs] = React.useState<string[]>([]);
  const [importedProducts, setImportedProducts] = React.useState<CategoryPageProduct[]>([]);
  const activeSearchQuery = deferredSearchQuery.trim();

  const getRouteSlug = React.useCallback((product: CategoryPageProduct) => {
    const explicitRouteSlug = product.routeSlug?.trim();
    return explicitRouteSlug && explicitRouteSlug.length > 0
      ? explicitRouteSlug
      : getProductRouteSlug(product);
  }, []);

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
    let cancelled = false;

    async function loadImportedProducts() {
      try {
        const response = await fetch(`/api/categories/${categorySlug}/products`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as CategoryProductsResponse;
        if (cancelled || !json.success) {
          return;
        }

        setImportedProducts(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) {
          setImportedProducts([]);
        }
      }
    }

    void loadImportedProducts();

    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  const allProducts = React.useMemo(() => {
    const seenRouteSlugs = new Set<string>();
    const combinedProducts: CategoryPageProduct[] = [];

    for (const product of [...products, ...importedProducts]) {
      const routeSlug = getRouteSlug(product);

      if (seenRouteSlugs.has(routeSlug)) {
        continue;
      }

      seenRouteSlugs.add(routeSlug);
      combinedProducts.push({
        ...product,
        routeSlug,
      });
    }

    return combinedProducts;
  }, [getRouteSlug, importedProducts, products]);

  React.useEffect(() => {
    const availableRouteSlugs = new Set(allProducts.map((item) => getRouteSlug(item)));

    setSelectedRouteSlugs((current) => {
      const next = current.filter((slug) => availableRouteSlugs.has(slug));
      return next.length === current.length ? current : next;
    });
  }, [allProducts, getRouteSlug]);

  const categoryProducts = React.useMemo(() => {
    return allProducts.map((item, index) => {
      const routeSlug = getRouteSlug(item);
      const stats = ratingStats[routeSlug];
      const productImageUrl = getProductImageUrl(item);
      return {
        item,
        name: item.name,
        routeSlug,
        originalImageUrl: productImageUrl,
        hasImage: productImageUrl !== DEFAULT_PRODUCT_IMAGE,
        ratingAvg: stats?.ratingAvg ?? null,
        ratingCount: stats?.ratingCount ?? 0,
        newIndex: index,
        priceValue: getProductPriceValue(item),
      };
    });
  }, [allProducts, getRouteSlug, ratingStats]);

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
      if (left.hasImage !== right.hasImage) {
        return left.hasImage ? -1 : 1;
      }

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

      {!statsLoaded && <p className="text-[#8CA1B8] text-center mb-8">Lade Bewertungen...</p>}

      <ProductComparisonPanel
        title={title}
        products={comparedProducts}
        limit={COMPARE_LIMIT}
        onRemove={toggleCompareSelection}
        onClear={() => setSelectedRouteSlugs([])}
      />

      <section className="mb-6 rounded-[24px] border border-[#2D3A4B] bg-[linear-gradient(145deg,rgba(19,27,38,0.96),rgba(12,18,27,0.98))] p-4 shadow-[0_18px_42px_rgba(0,0,0,0.2)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="category-search" className="sr-only">
              In {title} suchen
            </label>
            <input
              id="category-search"
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`In ${title} suchen, z. B. Salami oder Vanille`}
              className="min-h-11 w-full rounded-2xl border border-[#2D3A4B] bg-[#101822]/90 px-4 text-white outline-none transition-colors placeholder:text-[#70839A] focus:border-[#5EE287]"
            />
          </div>

          <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#BFD0E2]">
            {visibleProducts.length} Produkte
          </span>

          <span className="rounded-full border border-[#35506D] bg-[#122233] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D9ECFF]">
            Vergleich {comparedProducts.length}/{COMPARE_LIMIT}
          </span>

          <div className="relative w-full sm:w-[220px]">
            <label htmlFor="category-sort" className="sr-only">
              Produkte sortieren
            </label>
            <select
              id="category-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as CategorySortMode)}
              aria-label="Produkte sortieren"
              className="min-h-11 w-full appearance-none rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-4 pr-11 text-sm font-semibold text-white outline-none transition-colors focus:border-[#5EE287]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sortieren: {option.label}
                </option>
              ))}
            </select>
            <FiChevronDown
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8CA1B8]"
            />
          </div>
        </div>
      </section>

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
