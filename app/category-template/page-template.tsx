"use client";

import { useState, useEffect } from "react";
import BackButton from "../components/BackButton";
import Star from "../components/Star";
import Link from "next/link";

interface Product {
  name: string;
  imageUrl: string;
  slug: string; // 👈 neu wichtig!
}

export default function CategoryPage({
  title,
  icon,
  products,
  storageKey,
}: {
  title: string;
  icon: string;
  products: Product[];
  storageKey: string;
}) {
  const [sortMode, setSortMode] = useState("rating-desc");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedRatings = localStorage.getItem(storageKey + "_ratings");
    const savedComments = localStorage.getItem(storageKey + "_comments");

    if (savedRatings) setRatings(JSON.parse(savedRatings));
    if (savedComments) setComments(JSON.parse(savedComments));

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(storageKey + "_ratings", JSON.stringify(ratings));
    localStorage.setItem(storageKey + "_comments", JSON.stringify(comments));
  }, [ratings, comments, isLoaded]);

  const saveRating = (name: string, value: number) =>
    setRatings({ ...ratings, [name]: value });

  const clearRating = (name: string) =>
    setRatings({ ...ratings, [name]: 0 });

  return (
    <div className="max-w-4xl mx-auto mt-28 px-4">

      <BackButton />

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-6xl">{icon}</span>
        <h1 className="text-4xl font-extrabold tracking-wide text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
          {title}
        </h1>
      </div>

      {/* SORT */}
      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value)}
        className="
          w-full border rounded-lg px-3 py-2 mb-6 bg-[#1F2428]
          text-white border-[#2A3036]
        "
      >
        <option value="rating-desc">⭐ Beste zuerst</option>
        <option value="rating-asc">⭐ Schlechteste zuerst</option>
        <option value="name-asc">A–Z</option>
        <option value="name-desc">Z–A</option>
      </select>

      {/* POSTER GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {products
          .sort((a, b) => {
            if (sortMode === "rating-desc")
              return (ratings[b.name] || 0) - (ratings[a.name] || 0);
            if (sortMode === "rating-asc")
              return (ratings[a.name] || 0) - (ratings[b.name] || 0);
            if (sortMode === "name-asc")
              return a.name.localeCompare(b.name);
            if (sortMode === "name-desc")
              return b.name.localeCompare(a.name);
            return 0;
          })
          .map((item) => (
            <Link
              key={item.slug}
              href={`/produkt/${item.slug}`}
              className="
                group relative rounded-xl overflow-hidden cursor-pointer
                bg-[#1A1F23] border border-[#2A3036]
                hover:border-[#4CAF50]
                hover:shadow-[0_0_25px_rgba(76,175,80,0.3)]
                transition-all
              "
              style={{ aspectRatio: "2 / 3" }}
            >
              {/* Product Image */}
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />

              {/* NAME + RATING OVERLAY */}
              <div className="
                absolute bottom-0 left-0 w-full
                bg-gradient-to-t from-black/90 via-black/50 to-transparent
                p-3
              ">
                <h3 className="text-white text-sm font-semibold drop-shadow-[0_6px_18px_rgba(0,0,0,1)]">
                  {item.name}
                </h3>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="
                    flex items-center mt-1 gap-1
                    drop-shadow-[0_6px_18px_rgba(0,0,0,1)]
                  "
                >
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      rating={ratings[item.name] || 0}
                      index={i}
                      onRate={(v) => saveRating(item.name, v)}
                    />
                  ))}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRating(item.name);
                    }}
                    className="text-gray-300 hover:text-red-600 ml-2"
                  >
                    ⟲
                  </button>
                </div>
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
