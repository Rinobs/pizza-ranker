"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ALL_PRODUCTS,
  PIZZA_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
} from "./data/products";

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

type HomeSectionsResponse = {
  topPizza: RankedProduct[];
  newlyAdded: RankedProduct[];
  trending: RankedProduct[];
  bestThisWeek: RankedProduct[];
  hasLiveRatings: boolean;
  generatedAt: string;
};

const categories = [
  { name: "Tiefkuehlpizza", icon: "\u{1F355}", slug: "pizza" },
  { name: "Chips", icon: "\u{1F35F}", slug: "chips" },
  { name: "Suessigkeiten", icon: "\u{1F36C}", slug: "suessigkeiten" },
  { name: "Tiefkuehlgerichte", icon: "\u{1F372}", slug: "tiefkuehlgerichte" },
  { name: "Getraenke", icon: "\u{1F964}", slug: "getraenke" },
  { name: "Eis", icon: "\u{1F366}", slug: "eis" },
  { name: "Proteinpulver", icon: "\u{1F4AA}", slug: "proteinpulver" },
  { name: "Proteinriegel", icon: "\u{1F36B}", slug: "proteinriegel" },
];

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

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getSearchScore(product: Product, normalizedQuery: string) {
  const name = normalizeSearchText(product.name);
  const category = normalizeSearchText(product.category);
  const routeSlug = normalizeSearchText(getProductRouteSlug(product));

  let score = 0;

  if (name === normalizedQuery) score = Math.max(score, 320);
  if (name.startsWith(normalizedQuery)) score = Math.max(score, 260);
  if (name.includes(normalizedQuery)) score = Math.max(score, 220);
  if (category === normalizedQuery) score = Math.max(score, 180);
  if (category.includes(normalizedQuery)) score = Math.max(score, 150);
  if (routeSlug.includes(normalizedQuery)) score = Math.max(score, 120);

  return score;
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
        onError={(e) => {
          const image = e.currentTarget;
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
        {product.ratingAvg !== null && (
          <p className="text-xs sm:text-sm text-yellow-300 mt-1.5">
            {"\u2B50"} {product.ratingAvg.toFixed(1)} ({product.ratingCount})
          </p>
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

export default function HomeContent() {
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get("q") || "").trim();
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchText(searchQuery),
    [searchQuery]
  );

  const fallback = useMemo(() => fallbackSections(), []);
  const [sections, setSections] = useState<HomeSectionsResponse>(fallback);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSections() {
      try {
        const res = await fetch("/api/home/sections", { cache: "no-store" });
        if (!res.ok) return;

        const json = (await res.json()) as Partial<HomeSectionsResponse>;
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
            typeof json.generatedAt === "string"
              ? json.generatedAt
              : fallback.generatedAt,
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSections();

    return () => {
      cancelled = true;
    };
  }, [fallback]);

  const rankedLookup = useMemo(() => {
    const lookup = new Map<string, RankedProduct>();

    for (const group of [
      sections.topPizza,
      sections.newlyAdded,
      sections.trending,
      sections.bestThisWeek,
    ]) {
      for (const product of group) {
        lookup.set(product.routeSlug, product);
      }
    }

    return lookup;
  }, [sections]);

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [] as RankedProduct[];
    }

    const scored: Array<{ product: RankedProduct; score: number }> = [];

    for (const product of ALL_PRODUCTS) {
      const score = getSearchScore(product, normalizedSearchQuery);
      if (score <= 0) continue;

      const base = toRankedProduct(product);
      const stats = rankedLookup.get(base.routeSlug);

      scored.push({
        score,
        product: stats
          ? {
              ...base,
              ratingAvg: stats.ratingAvg,
              ratingCount: stats.ratingCount,
              weekRatingAvg: stats.weekRatingAvg,
              weekRatingCount: stats.weekRatingCount,
            }
          : base,
      });
    }

    scored.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      const aAvg = a.product.ratingAvg ?? -1;
      const bAvg = b.product.ratingAvg ?? -1;
      if (aAvg !== bAvg) return bAvg - aAvg;

      if (a.product.ratingCount !== b.product.ratingCount) {
        return b.product.ratingCount - a.product.ratingCount;
      }

      return a.product.name.localeCompare(b.product.name);
    });

    return scored.map((entry) => entry.product);
  }, [normalizedSearchQuery, rankedLookup]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0F141A] via-[#121A24] to-[#0F141A] text-white px-4 sm:px-8 lg:px-12 pb-24 pt-28">
      <div className="text-center pb-14">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
          FoodRanker
        </h1>
        <p className="text-[#B7C4D3] mt-3 text-base sm:text-lg">
          Finde und bewerte deine Lieblingsprodukte.
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {searchQuery ? (
          <section className="mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 tracking-tight text-[#E8F6ED]">
              {"\u{1F50E}"} Suchergebnisse f\u00FCr {searchQuery}
            </h2>

            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
                {searchResults.map((product) => (
                  <ProductCard key={`search-${product.routeSlug}`} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 text-[#C4D0DE]">
                Keine Treffer gefunden. Versuche z. B. pizza, eis oder einen Markennamen.
              </div>
            )}
          </section>
        ) : (
          <>
            <ProductSection
              title={"\u{1F525} Top 10 Tiefk\u00FChlpizzen"}
              products={sections.topPizza}
            />
            <ProductSection
              title={"\u{1F195} Neu hinzugef\u00FCgt"}
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
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-7">
                {categories.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/${cat.slug}`}
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
                      {cat.icon}
                    </div>
                    <h3 className="text-xl font-semibold tracking-wide text-white group-hover:text-[#8AF5AC] transition-colors duration-300">
                      {cat.name}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        <p className="text-xs text-[#8CA1B8] mt-10 text-center">
          {searchQuery
            ? searchResults.length > 0
              ? `${searchResults.length} Treffer gefunden.`
              : "Keine Treffer gefunden."
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
