"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export function useUserRatings() {
  const { data: session } = useSession();
  const user = session?.user;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  // -----------------------------------------
  // 🔥 Ratings laden
  // -----------------------------------------
  useEffect(() => {
    if (!user) return;

    async function load() {
      const res = await fetch("/api/ratings/all");
      const json = await res.json();

      if (!json.success) return;

      const rMap: Record<string, number> = {};
      const cMap: Record<string, string> = {};

      json.data.forEach((r: any) => {
        rMap[r.product_slug] = r.rating;
        cMap[r.product_slug] = r.comment || "";
      });

      setRatings(rMap);
      setComments(cMap);
      setLoaded(true);
    }

    load();
  }, [user]);

  // -----------------------------------------
  // 🔥 Rating speichern
  // -----------------------------------------
  async function saveRating(slug: string, value: number) {
    setRatings((prev) => ({ ...prev, [slug]: value }));

    await fetch(`/api/ratings/${slug}`, {
      method: "POST",
      body: JSON.stringify({
        rating: value,
        comment: comments[slug] || "",
      }),
    });
  }

  // -----------------------------------------
  // 🔥 Kommentar speichern
  // -----------------------------------------
  async function saveComment(slug: string, text: string) {
    setComments((prev) => ({ ...prev, [slug]: text }));

    await fetch(`/api/ratings/${slug}`, {
      method: "POST",
      body: JSON.stringify({
        rating: ratings[slug] || 0,
        comment: text,
      }),
    });
  }

  return {
    user,
    ratings,
    comments,
    saveRating,
    saveComment,
    loaded,
  };
}
