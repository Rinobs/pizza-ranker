"use client";

import Link from "next/link";
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

        <p className="text-xs text-[#8CA1B8] mt-10 text-center">
          {isLoading
            ? "Lade Highlights..."
            : sections.hasLiveRatings
            ? "Highlights basieren auf vorhandenen Bewertungen."
            : "Es sind noch zu wenige Live-Bewertungen vorhanden. Zeige Standard-Highlights."}
        </p>
      </div>
    </main>
  );
}
