"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type RatingRow = {
  product_slug: string;
  rating: number;
  comment: string | null;
};

type RatingsResponse = {
  success: boolean;
  data?: RatingRow[];
  ratings?: RatingRow[];
};

export function useUserRatings() {
  const { data: session } = useSession();
  const user = session?.user;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRatings({});
      setComments({});
      setLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setLoaded(false);

    async function load() {
      try {
        const response = await fetch("/api/ratings/all", {
          cache: "no-store",
        });

        const json = (await response.json()) as RatingsResponse;

        if (!response.ok || !json.success) {
          return;
        }

        const rows = Array.isArray(json.data)
          ? json.data
          : Array.isArray(json.ratings)
            ? json.ratings
            : [];

        const nextRatings: Record<string, number> = {};
        const nextComments: Record<string, string> = {};

        for (const row of rows) {
          nextRatings[row.product_slug] = row.rating;
          nextComments[row.product_slug] = row.comment ?? "";
        }

        if (cancelled) return;
        setRatings(nextRatings);
        setComments(nextComments);
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function persistRating(slug: string, rating: number, comment: string) {
    if (!user) return;

    await fetch(`/api/ratings/${slug}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating,
        comment,
      }),
    });
  }

  async function saveRating(slug: string, value: number) {
    setRatings((prev) => ({ ...prev, [slug]: value }));
    await persistRating(slug, value, comments[slug] || "");
  }

  async function saveComment(slug: string, text: string) {
    setComments((prev) => ({ ...prev, [slug]: text }));
    await persistRating(slug, ratings[slug] || 0, text);
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
