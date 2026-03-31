"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  buildReviewLikeKey,
  type ReviewLikeState,
} from "@/lib/review-likes";

type ReviewLikeResponse = {
  success: boolean;
  data?: {
    productSlug: string;
    reviewUserId: string;
    likeCount: number;
    viewerLiked: boolean;
  };
  error?: string;
};

function buildInitialState(initialEntries: ReviewLikeState[]) {
  return initialEntries.reduce<
    Record<string, { likeCount: number; viewerLiked: boolean }>
  >((acc, entry) => {
    acc[buildReviewLikeKey(entry.reviewUserId, entry.productSlug)] = {
      likeCount: entry.likeCount,
      viewerLiked: entry.viewerLiked,
    };
    return acc;
  }, {});
}

export function useReviewLikes(initialEntries: ReviewLikeState[]) {
  const { data: session } = useSession();
  const user = session?.user;

  const [likesByKey, setLikesByKey] = useState<
    Record<string, { likeCount: number; viewerLiked: boolean }>
  >(() => buildInitialState(initialEntries));
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLikesByKey(buildInitialState(initialEntries));
  }, [initialEntries]);

  function getReviewLikeState(reviewUserId: string, productSlug: string) {
    return (
      likesByKey[buildReviewLikeKey(reviewUserId, productSlug)] ?? {
        likeCount: 0,
        viewerLiked: false,
      }
    );
  }

  function isUpdating(reviewUserId: string, productSlug: string) {
    return updating[buildReviewLikeKey(reviewUserId, productSlug)] === true;
  }

  async function toggleReviewLike(reviewUserId: string, productSlug: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } satisfies ReviewLikeResponse;
    }

    const key = buildReviewLikeKey(reviewUserId, productSlug);
    const current = getReviewLikeState(reviewUserId, productSlug);
    const nextViewerLiked = !current.viewerLiked;
    const previousState = likesByKey;

    setUpdating((prev) => ({ ...prev, [key]: true }));
    setError(null);
    setLikesByKey((prev) => ({
      ...prev,
      [key]: {
        likeCount: Math.max(0, current.likeCount + (nextViewerLiked ? 1 : -1)),
        viewerLiked: nextViewerLiked,
      },
    }));

    try {
      const response = await fetch("/api/review-likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productSlug,
          reviewUserId,
          active: nextViewerLiked,
        }),
      });

      const json = (await response.json()) as ReviewLikeResponse;

      if (!response.ok || !json.success || !json.data) {
        setLikesByKey(previousState);
        const message = json.error || "Kommentar konnte nicht gelikt werden.";
        setError(message);

        return {
          success: false,
          error: message,
        } satisfies ReviewLikeResponse;
      }

      setLikesByKey((prev) => ({
        ...prev,
        [key]: {
          likeCount: json.data?.likeCount ?? 0,
          viewerLiked: json.data?.viewerLiked ?? false,
        },
      }));

      return json;
    } catch {
      setLikesByKey(previousState);

      const message = "Kommentar konnte nicht gelikt werden.";
      setError(message);

      return {
        success: false,
        error: message,
      } satisfies ReviewLikeResponse;
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  }

  return {
    user,
    error,
    getReviewLikeState,
    toggleReviewLike,
    isUpdating,
  };
}
