"use client";

import React from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";
import { getProductImageUrl, getProductRouteSlug, type Product } from "@/app/data/products";
import {
  DEFAULT_DISCOVER_SORT,
  compareByDiscoverSort,
  getProductSearchScore,
  type DiscoverSortMode,
} from "@/lib/product-navigation";

type RatingStat = {
  ratingAvg: number | null;
  ratingCount: number;
};

type RatingSummaryResponse = {
  success?: boolean;
  stats?: Record<string, RatingStat>;
};

type VisibleProduct = {
  item: Product;
  name: string;
  routeSlug: string;
  originalImageUrl: string;
  ratingAvg: number | null;
  ratingCount: number;
  newIndex: number;
  searchScore: number;
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

function getChipClass(active: boolean) {
  return `rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
    active
      ? "border-[#5EE287] bg-[#173023] text-[#D9FFE6] shadow-[0_10px_24px_rgba(34,197,94,0.16)]"
      : "border-[#2D3A4B] bg-[#141C27] text-[#B7C4D3] hover:border-[#5EE287] hover:text-white"
  }`;
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
  const [sortMode, setSortMode] = React.useState<DiscoverSortMode>(DEFAULT_DISCOVER_SORT);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [ratingStats, setRatingStats] = React.useState<Record<string, RatingStat>>({});
  const [statsLoaded, setStatsLoaded] = React.useState(false);

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

  const visibleProducts = React.useMemo(() => {
    const result: VisibleProduct[] = [];

    for (const [index, item] of products.entries()) {
      const routeSlug = getProductRouteSlug(item);
      const stats = ratingStats[routeSlug];
      const score = searchQuery ? getProductSearchScore(item, searchQuery) : 0;

      if (searchQuery && score <= 0) {
        continue;
      }

      result.push({
        item,
        name: item.name,
        routeSlug,
        originalImageUrl: getProductImageUrl(item),
        ratingAvg: stats?.ratingAvg ?? null,
        ratingCount: stats?.ratingCount ?? 0,
        newIndex: index,
        searchScore: score,
      });
    }

    result.sort((left, right) => {
      if (searchQuery && left.searchScore !== right.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return compareByDiscoverSort(left, right, sortMode);
    });

    return result;
  }, [products, ratingStats, searchQuery, sortMode]);

  const activeSort = SORT_OPTIONS.find((option) => option.value === sortMode);

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
            Suche innerhalb der Kategorie und sortiere direkt nach Neu, Beliebt oder Beste.
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-[28px] border border-[#2D3A4B] bg-[linear-gradient(135deg,rgba(21,31,43,0.96),rgba(14,20,30,0.98))] p-5 sm:p-6 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]">
          <div>
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
              Suche nach Produktnamen, Marken oder typischen Begriffen und kombiniere das mit der
              Sortierung.
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">
              Sortieren nach
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                  className={getChipClass(sortMode === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-[#8CA1B8]">
              Aktuell: <span className="text-[#E8F6ED]">{activeSort?.hint ?? "Sortierung aktiv"}</span>
            </p>
          </div>
        </div>
      </section>

      {!statsLoaded && <p className="text-[#8CA1B8] text-center mb-8">Lade Bewertungen...</p>}

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
        <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5 text-[#BFD0E2]">
          {visibleProducts.length} Produkte
        </span>
        {searchQuery && (
          <span className="rounded-full border border-[#3F5C7A] bg-[#122233] px-3 py-1.5 text-[#D9ECFF]">
            Suche aktiv
          </span>
        )}
      </div>

      {visibleProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
          {visibleProducts.map((product) => (
            <Link
              key={product.routeSlug}
              href={`/produkt/${product.routeSlug}`}
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
              <img
                src={`/api/product-image/${product.routeSlug}`}
                alt={product.item.name}
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
                  image.src = product.originalImageUrl;
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-95 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-0 left-0 w-full p-4">
                <h3 className="text-white text-sm sm:text-base font-semibold line-clamp-2">
                  {product.item.name}
                </h3>

                {product.ratingAvg !== null && product.ratingCount > 0 ? (
                  <p className="text-xs sm:text-sm text-yellow-300 mt-1.5">
                    {"\u2B50"} {product.ratingAvg.toFixed(1)} ({product.ratingCount})
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#8CA1B8] mt-1.5">Noch keine Bewertungen</p>
                )}

                <p className="text-[11px] text-[#BFD0E2] mt-2">
                  Tippe auf das Produkt, um zu bewerten und zu kommentieren.
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 text-[#C4D0DE]">
          Keine Treffer gefunden. Versuche einen anderen Suchbegriff oder wechsle die Sortierung.
        </div>
      )}
    </div>
  );
}