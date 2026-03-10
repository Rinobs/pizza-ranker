"use client";

import React from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";
import { getProductImageUrl, getProductRouteSlug, type Product } from "@/app/data/products";

type RatingStat = {
  ratingAvg: number | null;
  ratingCount: number;
};

type RatingSummaryResponse = {
  success?: boolean;
  stats?: Record<string, RatingStat>;
};

export default function CategoryPage({
  title,
  icon,
  products,
}: {
  title: string;
  icon: string;
  products: Product[];
}) {
  const [sortMode, setSortMode] = React.useState("rating-desc");
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

  const sortedProducts = React.useMemo(() => {
    return [...products].sort((a, b) => {
      const routeSlugA = getProductRouteSlug(a);
      const routeSlugB = getProductRouteSlug(b);
      const ratingA = ratingStats[routeSlugA]?.ratingAvg ?? 0;
      const ratingB = ratingStats[routeSlugB]?.ratingAvg ?? 0;
      const ratingCountA = ratingStats[routeSlugA]?.ratingCount ?? 0;
      const ratingCountB = ratingStats[routeSlugB]?.ratingCount ?? 0;

      if (sortMode === "rating-desc") {
        if (ratingB !== ratingA) return ratingB - ratingA;
        if (ratingCountB !== ratingCountA) return ratingCountB - ratingCountA;
        return a.name.localeCompare(b.name, "de");
      }

      if (sortMode === "rating-asc") {
        if (ratingA !== ratingB) return ratingA - ratingB;
        if (ratingCountA !== ratingCountB) return ratingCountA - ratingCountB;
        return a.name.localeCompare(b.name, "de");
      }

      if (sortMode === "name-asc") return a.name.localeCompare(b.name, "de");
      if (sortMode === "name-desc") return b.name.localeCompare(a.name, "de");

      return 0;
    });
  }, [products, ratingStats, sortMode]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="flex items-center gap-4 mb-10">
        <span className="text-6xl">{icon}</span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#E8F6ED]">{title}</h1>
      </div>

      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value)}
        className="w-full border rounded-xl px-4 py-3 mb-8 bg-[#1B222D] text-white border-[#2D3A4B] focus:border-[#5EE287] outline-none transition-colors"
      >
        <option value="rating-desc">Beste zuerst</option>
        <option value="rating-asc">Schlechteste zuerst</option>
        <option value="name-asc">A-Z</option>
        <option value="name-desc">Z-A</option>
      </select>

      {!statsLoaded && <p className="text-[#8CA1B8] text-center mb-8">Lade Bewertungen...</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
        {sortedProducts.map((item) => {
          const routeSlug = getProductRouteSlug(item);
          const originalImageUrl = getProductImageUrl(item);
          const stats = ratingStats[routeSlug];
          const ratingAvg = stats?.ratingAvg ?? null;
          const ratingCount = stats?.ratingCount ?? 0;

          return (
            <Link
              key={routeSlug}
              href={`/produkt/${routeSlug}`}
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
                src={`/api/product-image/${routeSlug}`}
                alt={item.name}
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
                  image.src = originalImageUrl;
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-95 group-hover:opacity-100 transition-opacity" />

              <div className="absolute bottom-0 left-0 w-full p-4">
                <h3 className="text-white text-sm sm:text-base font-semibold line-clamp-2">{item.name}</h3>

                {ratingAvg !== null && ratingCount > 0 ? (
                  <p className="text-xs sm:text-sm text-yellow-300 mt-1.5">
                    {"\u2B50"} {ratingAvg.toFixed(1)} ({ratingCount})
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#8CA1B8] mt-1.5">Noch keine Bewertungen</p>
                )}

                <p className="text-[11px] text-[#BFD0E2] mt-2">
                  Tippe auf das Produkt, um zu bewerten und zu kommentieren.
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

