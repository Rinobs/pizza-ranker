"use client";

import { useEffect, useState } from "react";
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
  error?: string;
};

type SaveRatingResponse = {
  success: boolean;
  data?: RatingRow;
  error?: string;
};

type DeleteRatingResponse = {
  success: boolean;
  data?: {
    product_slug: string;
  };
  error?: string;
};

type ProfileResponse = {
  success: boolean;
  data?: {
    username: string | null;
  };
  error?: string;
};

type SaveProfileResponse = {
  success: boolean;
  data?: {
    username: string | null;
  };
  error?: string;
};

const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 40;
const MAX_COMMENT_LENGTH = 1000;

function normalizeHalfStepRating(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe * 2) / 2;

  if (rounded < 0) return 0;
  if (rounded > 5) return 5;

  return rounded;
}

export function useUserRatings() {
  const { data: session } = useSession();
  const user = session?.user;

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({});
  const [loaded, setLoaded] = useState(false);

  const [username, setUsername] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setRatings({});
      setComments({});
      setCommentDrafts({});
      setSubmittingComments({});
      setCommentErrors({});
      setLoaded(true);

      setUsername("");
      setProfileLoaded(true);
      setSavingUsername(false);
      setProfileError(null);

      return () => {
        cancelled = true;
      };
    }

    setLoaded(false);
    setProfileLoaded(false);
    setProfileError(null);

    async function load() {
      try {
        const [ratingsResponse, profileResponse] = await Promise.all([
          fetch("/api/ratings/all", {
            cache: "no-store",
          }),
          fetch("/api/profile", {
            cache: "no-store",
          }),
        ]);

        const ratingsJson = (await ratingsResponse.json()) as RatingsResponse;
        const profileJson = (await profileResponse.json()) as ProfileResponse;

        if (!cancelled && ratingsResponse.ok && ratingsJson.success) {
          const rows = Array.isArray(ratingsJson.data)
            ? ratingsJson.data
            : Array.isArray(ratingsJson.ratings)
              ? ratingsJson.ratings
              : [];

          const nextRatings: Record<string, number> = {};
          const nextComments: Record<string, string> = {};

          for (const row of rows) {
            nextRatings[row.product_slug] = normalizeHalfStepRating(row.rating);
            nextComments[row.product_slug] = row.comment ?? "";
          }

          setRatings(nextRatings);
          setComments(nextComments);
          setCommentDrafts(nextComments);
        }

        if (!cancelled && profileResponse.ok && profileJson.success) {
          setUsername(profileJson.data?.username ?? "");
        }
      } catch {
        if (!cancelled) {
          setProfileError("Daten konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
          setProfileLoaded(true);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function persistRating(slug: string, rating: number, comment: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as SaveRatingResponse;
    }

    try {
      const response = await fetch(`/api/ratings/${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: normalizeHalfStepRating(rating),
          comment,
        }),
      });

      const json = (await response.json()) as SaveRatingResponse;
      if (!response.ok || !json.success) {
        return {
          success: false,
          error: json.error || "Bewertung konnte nicht gespeichert werden.",
        } satisfies SaveRatingResponse;
      }

      return json;
    } catch {
      return {
        success: false,
        error: "Bewertung konnte nicht gespeichert werden.",
      } satisfies SaveRatingResponse;
    }
  }

  async function saveRating(slug: string, value: number) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as SaveRatingResponse;
    }

    const normalized = normalizeHalfStepRating(value);
    setRatings((prev) => ({ ...prev, [slug]: normalized }));

    const response = await persistRating(slug, normalized, comments[slug] || "");

    if (!response.success) {
      setCommentErrors((prev) => ({
        ...prev,
        [slug]: response.error || "Bewertung konnte nicht gespeichert werden.",
      }));
      return response;
    }

    setCommentErrors((prev) => ({ ...prev, [slug]: null }));

    return response;
  }

  async function deleteRating(slug: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as DeleteRatingResponse;
    }

    const previousRating = ratings[slug];
    const previousComment = comments[slug];
    const previousDraft = commentDrafts[slug];

    setRatings((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });

    setComments((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });

    setCommentDrafts((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });

    setCommentErrors((prev) => ({ ...prev, [slug]: null }));

    const rollback = () => {
      setRatings((prev) => {
        const next = { ...prev };
        if (previousRating === undefined) {
          delete next[slug];
        } else {
          next[slug] = previousRating;
        }
        return next;
      });

      setComments((prev) => {
        const next = { ...prev };
        if (previousComment === undefined) {
          delete next[slug];
        } else {
          next[slug] = previousComment;
        }
        return next;
      });

      setCommentDrafts((prev) => {
        const next = { ...prev };
        if (previousDraft === undefined) {
          delete next[slug];
        } else {
          next[slug] = previousDraft;
        }
        return next;
      });
    };

    try {
      const response = await fetch(`/api/ratings/${slug}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as DeleteRatingResponse;

      if (!response.ok || !json.success) {
        rollback();
        const error = json.error || "Bewertung konnte nicht gelöscht werden.";
        setCommentErrors((prev) => ({ ...prev, [slug]: error }));
        return {
          success: false,
          error,
        } as DeleteRatingResponse;
      }

      setSubmittingComments((prev) => ({ ...prev, [slug]: false }));
      setCommentErrors((prev) => ({ ...prev, [slug]: null }));

      return {
        success: true,
        data: json.data,
      } as DeleteRatingResponse;
    } catch {
      rollback();
      const error = "Bewertung konnte nicht gelöscht werden.";
      setCommentErrors((prev) => ({ ...prev, [slug]: error }));
      return {
        success: false,
        error,
      } as DeleteRatingResponse;
    }
  }

  function updateCommentDraft(slug: string, text: string) {
    const clamped = text.slice(0, MAX_COMMENT_LENGTH);

    setCommentDrafts((prev) => ({ ...prev, [slug]: clamped }));
    setCommentErrors((prev) => ({ ...prev, [slug]: null }));
  }

  async function submitComment(slug: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as SaveRatingResponse;
    }

    const draft = (commentDrafts[slug] || "").trim();

    if (!draft) {
      const error = "Bitte schreibe erst einen Kommentar.";
      setCommentErrors((prev) => ({ ...prev, [slug]: error }));
      return {
        success: false,
        error,
      } as SaveRatingResponse;
    }

    setSubmittingComments((prev) => ({ ...prev, [slug]: true }));

    try {
      const response = await persistRating(slug, ratings[slug] || 0, draft);

      if (!response.success) {
        const error = response.error || "Kommentar konnte nicht gesendet werden.";
        setCommentErrors((prev) => ({ ...prev, [slug]: error }));
        return response;
      }

      setComments((prev) => ({ ...prev, [slug]: draft }));
      setCommentDrafts((prev) => ({ ...prev, [slug]: draft }));
      setCommentErrors((prev) => ({ ...prev, [slug]: null }));

      return response;
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [slug]: false }));
    }
  }

  async function saveUsername(rawValue: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as SaveProfileResponse;
    }

    const nextValue = rawValue.trim();

    if (nextValue.length < MIN_USERNAME_LENGTH || nextValue.length > MAX_USERNAME_LENGTH) {
      const error = `Username muss zwischen ${MIN_USERNAME_LENGTH} und ${MAX_USERNAME_LENGTH} Zeichen lang sein.`;
      setProfileError(error);
      return {
        success: false,
        error,
      } as SaveProfileResponse;
    }

    setSavingUsername(true);
    setProfileError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: nextValue }),
      });

      const json = (await response.json()) as SaveProfileResponse;

      if (!response.ok || !json.success) {
        const error = json.error || "Username konnte nicht gespeichert werden.";
        setProfileError(error);
        return {
          success: false,
          error,
        } as SaveProfileResponse;
      }

      const savedUsername = json.data?.username?.trim() || nextValue;
      setUsername(savedUsername);

      return {
        success: true,
        data: {
          username: savedUsername,
        },
      } as SaveProfileResponse;
    } catch {
      const error = "Username konnte nicht gespeichert werden.";
      setProfileError(error);
      return {
        success: false,
        error,
      } as SaveProfileResponse;
    } finally {
      setSavingUsername(false);
    }
  }

  return {
    user,
    ratings,
    comments,
    commentDrafts,
    submittingComments,
    commentErrors,
    loaded,
    saveRating,
    deleteRating,
    updateCommentDraft,
    submitComment,
    username,
    saveUsername,
    profileLoaded,
    savingUsername,
    profileError,
    usernameLimits: {
      min: MIN_USERNAME_LENGTH,
      max: MAX_USERNAME_LENGTH,
    },
  };
}

