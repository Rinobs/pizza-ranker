"use client";

import { useState, useEffect } from "react";
import BackButton from "../components/BackButton";
import Star from "../components/Star";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Product {
  name: string;
  imageUrl: string;
  slug: string;
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
  storageKey: string; // wird nur für Sortieren/Key benutzt
}) {
  const { data: session } = useSession();
  const user = session?.user;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [sortMode, setSortMode] = useState("rating-desc");

  // -------------------------------------------------------------
  // 🔥 1) Ratings beim Laden automatisch aus Supabase holen
  // -------------------------------------------------------------
  useEffect(() => {
    if (!user) return; // erst laden, wenn eingeloggt

    async function loadRatings() {
      const res = await fetch("/api/ratings/all");
      const json = await res.json();

      if (!json.success) return;

      const userRatings = json.data;

      const ratingMap: Record<string, number> = {};
      const commentMap: Record<string, string> = {};

      userRatings.forEach((r: any) => {
        ratingMap[r.product_slug] = r.rating;
        commentMap[r.product_slug] = r.comment || "";
      });

      setRatings(ratingMap);
      setComments(commentMap);
    }

    loadRatings();
  }, [user]);

  // -------------------------------------------------------------
  // 🔥 2) Rating setzen -> an API schicken + UI aktualisieren
  // -------------------------------------------------------------
  const saveRating = async (slug: string, value: number) => {
    if (!user) return alert("Bitte zuerst einloggen!");

    setRatings((prev) => ({ ...prev, [slug]: value }));

    await fetch(`/api/ratings/${slug}`, {
      method: "POST",
      body: JSON.stringify({
        rating: value,
        comment: comments[slug] || "",
      }),
    });
  };

  // -------------------------------------------------------------
  // 🔥 3) Kommentar speichern
  // -------------------------------------------------------------
  const saveComment = async (slug: string, text: string) => {
    if (!user) return alert("Bitte zuerst einloggen!");

    setComments((prev) => ({ ...prev, [slug]: text }));

    await fetch(`/api/ratings/${slug}`, {
      method: "POST",
      body: JSON.stringify({
        rating: ratings[slug] || 0,
        comment: text,
      }),
    });
  };

  // -------------------------------------------------------------
  // 🔥 SORTIERLOGIK
  // -------------------------------------------------------------
  const sortedProducts = [...products].sort((a, b) => {
    const ra = ratings[a.slug] || 0;
    const rb = ratings[b.slug] || 0;

    if (sortMode === "rating-desc") return rb - ra;
    if (sortMode === "rating-asc") return ra - rb;
    if (sortMode === "name-asc") return a.name.localeCompare(b.name);
    if (sortMode === "name-desc") return b.name.localeCompare(a.name);
    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto mt-28 px-4">
      <BackButton />

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-6xl">{icon}</span>
        <h1 className="text-4xl font-extrabold text-white">{title}</h1>
      </div>

      {/* SORT */}
      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-6 bg-[#1F2428] text-white border-[#2A3036]"
      >
        <option value="rating-desc">⭐ Beste zuerst</option>
        <option value="rating-asc">⭐ Schlechteste zuerst</option>
        <option value="name-asc">A–Z</option>
        <option value="name-desc">Z–A</option>
      </select>

      {/* GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {sortedProducts.map((item) => (
          <Link
            key={item.slug}
            href={`/produkt/${item.slug}`}
            className="group relative rounded-xl overflow-hidden bg-[#1A1F23] border border-[#2A3036]
            hover:border-[#4CAF50] transition-all"
            style={{ aspectRatio: "2 / 3" }}
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 p-3">
              <h3 className="text-white text-sm font-semibold">{item.name}</h3>

              {/* STAR RATING */}
              <div className="flex items-center mt-1 gap-1" onClick={(e) => e.stopPropagation()}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    rating={ratings[item.slug] || 0}
                    index={i}
                    onRate={(v) => saveRating(item.slug, v)}
                  />
                ))}
              </div>

              {/* COMMENT INPUT */}
              <input
                className="w-full mt-2 bg-[#222] text-white text-xs px-2 py-1 rounded"
                placeholder="Kommentar…"
                value={comments[item.slug] || ""}
                onChange={(e) => saveComment(item.slug, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
