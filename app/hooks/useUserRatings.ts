"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PROFILE_BIO_MAX_LENGTH } from "@/lib/profile-features";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "@/lib/review-comments";
import { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH } from "@/lib/username";

type RatingRow = {
  product_slug: string;
  rating: number;
  comment: string | null;
  updated_at: string | null;
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

type ProfilePayload = {
  username: string | null;
  hasUsername: boolean;
  canSetUsername: boolean;
  bio: string | null;
  avatarUrl: string | null;
  supportsProfileDetails: boolean;
};

type ProfileResponse = {
  success: boolean;
  data?: ProfilePayload;
  error?: string;
};

type SaveProfileResponse = {
  success: boolean;
  data?: ProfilePayload;
  error?: string;
};

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
  const [hasUsername, setHasUsername] = useState(false);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [supportsProfileDetails, setSupportsProfileDetails] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingProfileDetails, setSavingProfileDetails] = useState(false);
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
      setHasUsername(false);
      setBio("");
      setAvatarUrl(null);
      setSupportsProfileDetails(true);
      setProfileLoaded(true);
      setSavingUsername(false);
      setSavingProfileDetails(false);
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
          const nextProfile = profileJson.data;
          const nextUsername = nextProfile?.username ?? "";
          setUsername(nextUsername);
          setHasUsername(nextProfile?.hasUsername ?? nextUsername.trim().length > 0);
          setBio(nextProfile?.bio ?? "");
          setAvatarUrl(nextProfile?.avatarUrl ?? null);
          setSupportsProfileDetails(nextProfile?.supportsProfileDetails ?? true);
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

  async function deleteSavedEntry(slug: string, target: "rating" | "comment") {
    try {
      const response = await fetch(`/api/ratings/${slug}?target=${target}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as DeleteRatingResponse;

      if (!response.ok || !json.success) {
        return {
          success: false,
          error:
            json.error ||
            (target === "comment"
              ? "Kommentar konnte nicht gelöscht werden."
              : "Bewertung konnte nicht gelöscht werden."),
        } as DeleteRatingResponse;
      }

      return {
        success: true,
        data: json.data,
      } as DeleteRatingResponse;
    } catch {
      return {
        success: false,
        error:
          target === "comment"
            ? "Kommentar konnte nicht gelöscht werden."
            : "Bewertung konnte nicht gelöscht werden.",
      } as DeleteRatingResponse;
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

    setSubmittingComments((prev) => ({ ...prev, [slug]: true }));
    setRatings((prev) => {
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
    };

    try {
      const response = await deleteSavedEntry(slug, "rating");

      if (!response.success) {
        rollback();
        setCommentErrors((prev) => ({
          ...prev,
          [slug]: response.error || "Bewertung konnte nicht gelöscht werden.",
        }));
      }

      return response;
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [slug]: false }));
    }
  }

  async function deleteComment(slug: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as DeleteRatingResponse;
    }

    const previousComment = comments[slug];
    const previousDraft = commentDrafts[slug];

    setSubmittingComments((prev) => ({ ...prev, [slug]: true }));
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
      const response = await deleteSavedEntry(slug, "comment");

      if (!response.success) {
        rollback();
        setCommentErrors((prev) => ({
          ...prev,
          [slug]: response.error || "Kommentar konnte nicht gelöscht werden.",
        }));
      }

      return response;
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [slug]: false }));
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

    if (draft.length < MIN_COMMENT_LENGTH) {
      const error = `Kommentare brauchen mindestens ${MIN_COMMENT_LENGTH} Zeichen.`;
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
      setHasUsername(json.data?.hasUsername ?? savedUsername.length > 0);
      setBio(json.data?.bio ?? bio);
      setAvatarUrl(json.data?.avatarUrl ?? avatarUrl);
      setSupportsProfileDetails(json.data?.supportsProfileDetails ?? supportsProfileDetails);

      return {
        success: true,
        data: {
          username: savedUsername,
          hasUsername: json.data?.hasUsername ?? true,
          canSetUsername: json.data?.canSetUsername ?? false,
          bio: json.data?.bio ?? bio,
          avatarUrl: json.data?.avatarUrl ?? avatarUrl,
          supportsProfileDetails: json.data?.supportsProfileDetails ?? supportsProfileDetails,
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

  async function saveProfileDetails(updates: { bio?: string | null; avatarUrl?: string | null }) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as SaveProfileResponse;
    }

    setSavingProfileDetails(true);
    setProfileError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const json = (await response.json()) as SaveProfileResponse;

      if (!response.ok || !json.success || !json.data) {
        const error = json.error || "Profil konnte nicht gespeichert werden.";
        setProfileError(error);
        return {
          success: false,
          error,
        } as SaveProfileResponse;
      }

      const savedUsername = json.data.username?.trim() ?? username;
      setUsername(savedUsername);
      setHasUsername(json.data.hasUsername);
      setBio(json.data.bio ?? "");
      setAvatarUrl(json.data.avatarUrl ?? null);
      setSupportsProfileDetails(json.data.supportsProfileDetails);

      return {
        success: true,
        data: json.data,
      } as SaveProfileResponse;
    } catch {
      const error = "Profil konnte nicht gespeichert werden.";
      setProfileError(error);
      return {
        success: false,
        error,
      } as SaveProfileResponse;
    } finally {
      setSavingProfileDetails(false);
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
    deleteComment,
    updateCommentDraft,
    submitComment,
    username,
    hasUsername,
    bio,
    avatarUrl,
    supportsProfileDetails,
    saveUsername,
    saveProfileDetails,
    profileLoaded,
    savingUsername,
    savingProfileDetails,
    profileError,
    usernameLimits: {
      min: MIN_USERNAME_LENGTH,
      max: MAX_USERNAME_LENGTH,
    },
    profileLimits: {
      bioMax: PROFILE_BIO_MAX_LENGTH,
    },
  };
}

