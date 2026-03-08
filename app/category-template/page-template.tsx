"use client";

import React from "react";
import Link from "next/link";
import BackButton from "../components/BackButton";
import Star from "../components/Star";
import { useUserRatings } from "../hooks/useUserRatings";
import { getProductImageUrl, getProductRouteSlug, type Product } from "@/app/data/products";

export default function CategoryPage({
  title,
  icon,
  products,
}: {
  title: string;
  icon: string;
  products: Product[];
}) {
  const { user, ratings, comments, saveRating, saveComment, loaded } =
    useUserRatings();

  const [sortMode, setSortMode] = React.useState("rating-desc");

  const sortedProducts = [...products].sort((a, b) => {
    const routeSlugA = getProductRouteSlug(a);
    const routeSlugB = getProductRouteSlug(b);
    const ratingA = ratings[routeSlugA] || 0;
    const ratingB = ratings[routeSlugB] || 0;

    if (sortMode === "rating-desc") return ratingB - ratingA;
    if (sortMode === "rating-asc") return ratingA - ratingB;
    if (sortMode === "name-asc") return a.name.localeCompare(b.name);
    if (sortMode === "name-desc") return b.name.localeCompare(a.name);

    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto mt-28 px-4">
      <BackButton />

      <div className="flex items-center gap-4 mb-8">
        <span className="text-6xl">{icon}</span>
        <h1 className="text-4xl font-extrabold text-white">{title}</h1>
      </div>

      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-6 bg-[#1F2428] text-white border-[#2A3036]"
      >
        <option value="rating-desc">Beste zuerst</option>
        <option value="rating-asc">Schlechteste zuerst</option>
        <option value="name-asc">A-Z</option>
        <option value="name-desc">Z-A</option>
      </select>

      {!loaded && <p className="text-gray-400 text-center">Lade Bewertungen...</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {sortedProducts.map((item) => {
          const routeSlug = getProductRouteSlug(item);
          const originalImageUrl = getProductImageUrl(item);

          return (
            <Link
              key={routeSlug}
              href={`/produkt/${routeSlug}`}
              className="
                group relative rounded-xl overflow-hidden bg-[#1A1F23]
                border border-[#2A3036] hover:border-[#4CAF50]
                transition-all
              "
              style={{ aspectRatio: "2 / 3" }}
            >
              <img
                src={`/api/product-image/${routeSlug}`}
                alt={item.name}
                className="w-full h-full object-cover"
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

              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 p-3">
                <h3 className="text-white text-sm font-semibold">{item.name}</h3>

                <div
                  className="flex items-center mt-1 gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      rating={ratings[routeSlug] || 0}
                      index={i}
                      onRate={(v) => {
                        if (!user) return alert("Bitte zuerst einloggen!");
                        saveRating(routeSlug, v);
                      }}
                    />
                  ))}
                </div>

                <input
                  className="w-full mt-2 bg-[#222] text-white text-xs px-2 py-1 rounded"
                  placeholder="Kommentar..."
                  value={comments[routeSlug] || ""}
                  onChange={(e) => {
                    if (!user) return alert("Bitte zuerst einloggen!");
                    saveComment(routeSlug, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
