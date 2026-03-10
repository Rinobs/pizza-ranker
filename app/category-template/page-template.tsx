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
  const {
    user,
    ratings,
    commentDrafts,
    submittingComments,
    commentErrors,
    saveRating,
    updateCommentDraft,
    submitComment,
    loaded,
  } = useUserRatings();
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

      {!loaded && <p className="text-[#8CA1B8] text-center mb-8">Lade Bewertungen...</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-7">
        {sortedProducts.map((item) => {
          const routeSlug = getProductRouteSlug(item);
          const originalImageUrl = getProductImageUrl(item);

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

                <div
                  className="flex items-center mt-2 gap-1"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      rating={ratings[routeSlug] || 0}
                      index={i}
                      onRate={(v) => {
                        if (!user) return alert("Bitte zuerst einloggen!");
                        void saveRating(routeSlug, v);
                      }}
                    />
                  ))}
                </div>

                <input
                  className="w-full mt-3 bg-[#141C27]/95 border border-[#2D3A4B] text-white text-xs sm:text-sm px-3 py-2 rounded-lg placeholder:text-[#8CA1B8]"
                  placeholder="Kommentar..."
                  value={commentDrafts[routeSlug] || ""}
                  onChange={(e) => {
                    if (!user) return;
                    updateCommentDraft(routeSlug, e.target.value);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  maxLength={1000}
                />

                <div
                  className="mt-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    className="w-full rounded-lg bg-[#5EE287] text-[#0C1910] text-xs sm:text-sm font-semibold py-2 hover:bg-[#75F39B] disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={!user || submittingComments[routeSlug] === true}
                    onClick={async () => {
                      if (!user) return alert("Bitte zuerst einloggen!");
                      await submitComment(routeSlug);
                    }}
                  >
                    {submittingComments[routeSlug] ? "Sende..." : "Kommentar absenden"}
                  </button>
                </div>

                {commentErrors[routeSlug] && (
                  <p
                    className="text-[11px] text-red-300 mt-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {commentErrors[routeSlug]}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
