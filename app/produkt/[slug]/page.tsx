"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Star from "@/app/components/Star";
import BackButton from "@/app/components/BackButton";
import BuyButton from "@/app/components/BuyButton";
import ReviewLikeButton from "@/app/components/ReviewLikeButton";
import {
  ALL_PRODUCTS,
  getCategoryPlaceholderImage,
  getProductBuyLink,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
} from "@/app/data/products";
import { useUserCustomLists } from "@/app/hooks/useUserCustomLists";
import { useReviewLikes } from "@/app/hooks/useReviewLikes";
import { useUserRatings } from "@/app/hooks/useUserRatings";
import { useUserProductLists } from "@/app/hooks/useUserProductLists";
import { getCategoryAccent } from "@/lib/category-accents";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "@/lib/review-comments";

const PLACEHOLDER_TEXT = "9999";
const PLACEHOLDER_NUMBER = 9999;
const COMMENT_FALLBACK_USERNAME = "Anonym";

function humanizeRouteSlug(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

type ReviewReply = {
  id: number | null;
  userId: string | null;
  username: string;
  text: string;
  updatedAt: string | null;
  isOwnReply: boolean;
};

type ProductComment = {
  reviewUserId: string | null;
  username: string;
  text: string;
  updatedAt: string | null;
  isOwnComment: boolean;
  likeCount: number;
  viewerLiked: boolean;
  replyCount: number;
  replies: ReviewReply[];
};

type AminoAcidEntry = {
  name: string;
  amount: string;
};

type PriceOption = {
  id: string;
  label: string;
  value: string;
};

type ProductNutritionValues = {
  energyKj?: number | string;
  kcal: number | string;
  protein: number | string;
  fat: number | string;
  saturatedFat?: number | string;
  carbs: number | string;
  sugar?: number | string;
  ballaststoffe?: number | string;
  salz?: number | string;
  koffein?: number | string;
  glucomannan?: number | string;
  polyole?: number | string;
};

type NutritionOption = {
  id: string;
  label: string;
  values: ProductNutritionValues;
};

type SimilarProductSummary = {
  slug: string;
  name: string;
  category: string;
  imageUrl: string;
  price?: string;
  averageRating: number | null;
  ratingCount: number;
  overlapCount: number;
  source: "co_rated" | "category";
};

type ProductPayload = Product & {
  routeSlug: string;
  brand?: string | null;
  source: "catalog" | "open_food_facts";
  sourceLabel?: string | null;
  sourceUrl?: string | null;
};

type ProductDetailsPayload = {
  product?: ProductPayload;
  marke: string;
  gewicht: string;
  preis: string;
  kategorie?: string | null;
  zutaten: string;
  naehrwerte: ProductNutritionValues;
  aminosaeurenprofil?: AminoAcidEntry[];
  durchschnittsbewertung: number | string;
  kommentare: ProductComment[];
  preisOptionen?: PriceOption[];
  naehrwertOptionen?: NutritionOption[];
  aehnlicheProdukte?: SimilarProductSummary[];
  quelle: "online" | "placeholder";
};

type ReviewReplyResponse = {
  success: boolean;
  data?: {
    id?: number;
    reviewUserId?: string;
    productSlug?: string;
  };
  error?: string;
};

function SegmentToggle({
  options,
  activeId,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  activeId: string | null;
  onChange: (id: string) => void;
}) {
  if (options.length <= 1) {
    return null;
  }

  /* function handleStartEditingOwnComment() {
    updateCommentDraft(routeSlug, savedComment);
    setIsEditingOwnComment(true);
    setIsOwnCommentMenuOpen(false);
    setCommentMessage(null);
  } */

  /* async function handleDeleteOwnComment() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Möchtest du deinen Kommentar wirklich löschen?");
      if (!confirmed) {
        return;
      }
    }

    const response = await deleteComment(routeSlug);
    if (!response.success) {
      setCommentMessage(response.error || "Kommentar konnte nicht gelÃ¶scht werden.");
      return;
    }

    setIsEditingOwnComment(false);
    setIsOwnCommentMenuOpen(false);
    setCommentMessage("Kommentar erfolgreich gelÃ¶scht.");
    setDetailsReloadToken((prev) => prev + 1);
  } */

  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-[#2D3A4B] bg-[#111823] p-1">
      {options.map((option) => {
        const isActive = option.id === activeId;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? "bg-[#8AF5AC] text-[#112018]"
                : "text-[#AFC0D3] hover:bg-[#1A2533] hover:text-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function createFallbackDetails(product: Product): ProductDetailsPayload {
  return {
    marke: PLACEHOLDER_TEXT,
    gewicht: PLACEHOLDER_TEXT,
    preis: product.price?.trim() || PLACEHOLDER_TEXT,
    kategorie: null,
    zutaten: PLACEHOLDER_TEXT,
    naehrwerte: {
      energyKj: PLACEHOLDER_NUMBER,
      kcal: typeof product.kcal === "number" ? product.kcal : PLACEHOLDER_NUMBER,
      protein: typeof product.protein === "number" ? product.protein : PLACEHOLDER_NUMBER,
      fat: typeof product.fat === "number" ? product.fat : PLACEHOLDER_NUMBER,
      saturatedFat: PLACEHOLDER_NUMBER,
      carbs: typeof product.carbs === "number" ? product.carbs : PLACEHOLDER_NUMBER,
      sugar: PLACEHOLDER_NUMBER,
      ballaststoffe: PLACEHOLDER_NUMBER,
      salz: PLACEHOLDER_NUMBER,
      koffein: PLACEHOLDER_NUMBER,
      glucomannan: PLACEHOLDER_NUMBER,
      polyole: PLACEHOLDER_NUMBER,
    },
    aminosaeurenprofil: [],
    durchschnittsbewertung: PLACEHOLDER_NUMBER,
    kommentare: [],
    quelle: "placeholder",
  };
}

function isPlaceholderValue(value: string | number | null | undefined) {
  return value === undefined || value === null || value === PLACEHOLDER_NUMBER || value === PLACEHOLDER_TEXT;
}

function parseRatingValue(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(5, value));
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(5, parsed));
    }
  }

  return null;
}

function formatRatingValue(value: number) {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function ReadOnlyRatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const fillLevel = Math.max(0, Math.min(1, rating - index));
        const fillPercent = `${fillLevel * 100}%`;

        return (
          <span key={index} className="relative h-5 w-5">
            <svg
              className="absolute inset-0 text-[#334255]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
            </svg>
            <span
              className="absolute inset-y-0 left-0 overflow-hidden text-[#F6C85C]"
              style={{ width: fillPercent }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.54 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" />
              </svg>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function normalizeReplies(value: unknown): ReviewReply[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const reply = entry as Partial<ReviewReply>;
      const text = typeof reply.text === "string" ? reply.text.trim() : "";
      if (!text) {
        return null;
      }

      const username =
        typeof reply.username === "string" && reply.username.trim().length > 0
          ? reply.username.trim()
          : COMMENT_FALLBACK_USERNAME;

      const rawReplyId = (entry as { id?: unknown }).id;
      const rawId =
        typeof rawReplyId === "number"
          ? rawReplyId
          : typeof rawReplyId === "string"
            ? Number(rawReplyId)
            : null;

      return {
        id: typeof rawId === "number" && Number.isFinite(rawId) && rawId > 0 ? rawId : null,
        userId:
          typeof (reply as { userId?: unknown }).userId === "string" &&
          (reply as { userId?: string }).userId?.trim().length
            ? (reply as { userId: string }).userId.trim()
            : null,
        username,
        text,
        updatedAt: typeof reply.updatedAt === "string" ? reply.updatedAt : null,
        isOwnReply: reply.isOwnReply === true,
      } satisfies ReviewReply;
    })
    .filter((entry): entry is ReviewReply => entry !== null);
}

function normalizeComments(value: unknown): ProductComment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => {
      if (typeof entry === "string") {
        const text = entry.trim();
        if (!text) return null;

        return {
          reviewUserId: null,
          username: COMMENT_FALLBACK_USERNAME,
          text,
          updatedAt: null,
          isOwnComment: false,
          likeCount: 0,
          viewerLiked: false,
          replyCount: 0,
          replies: [],
        } satisfies ProductComment;
      }

      if (!entry || typeof entry !== "object") {
        return null;
      }

      const comment = entry as Partial<ProductComment>;
      const text = typeof comment.text === "string" ? comment.text.trim() : "";
      if (!text) {
        return null;
      }

      const username =
        typeof comment.username === "string" && comment.username.trim().length > 0
          ? comment.username.trim()
          : COMMENT_FALLBACK_USERNAME;
      const replies = normalizeReplies((comment as { replies?: unknown }).replies);
      const rawReplyCount = (comment as { replyCount?: unknown }).replyCount;
      const replyCount =
        typeof rawReplyCount === "number" && rawReplyCount >= 0
          ? Math.max(rawReplyCount, replies.length)
          : replies.length;

      return {
        reviewUserId:
          typeof (comment as { reviewUserId?: unknown }).reviewUserId === "string" &&
          (comment as { reviewUserId?: string }).reviewUserId?.trim().length
            ? (comment as { reviewUserId: string }).reviewUserId.trim()
            : null,
        username,
        text,
        updatedAt: typeof comment.updatedAt === "string" ? comment.updatedAt : null,
        isOwnComment: comment.isOwnComment === true,
        likeCount:
          typeof (comment as { likeCount?: unknown }).likeCount === "number" &&
          (comment as { likeCount: number }).likeCount >= 0
            ? (comment as { likeCount: number }).likeCount
            : 0,
        viewerLiked: (comment as { viewerLiked?: boolean }).viewerLiked === true,
        replyCount,
        replies,
      } satisfies ProductComment;
    })
    .filter((entry): entry is ProductComment => entry !== null);

  return normalized;
}

function mergeDetails(
  fallback: ProductDetailsPayload,
  incoming: Partial<ProductDetailsPayload> | null
): ProductDetailsPayload {
  if (!incoming) return fallback;

  const incomingComments = normalizeComments(incoming.kommentare);

  return {
    ...fallback,
    ...incoming,
    naehrwerte: {
      ...fallback.naehrwerte,
      ...(incoming.naehrwerte || {}),
    },
    kommentare: incomingComments.length > 0 ? incomingComments : fallback.kommentare,
  };
}

function normalizeProductPayload(value: unknown): ProductPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const product = value as Partial<ProductPayload>;
  const name = typeof product.name === "string" ? product.name.trim() : "";
  const imageUrl = typeof product.imageUrl === "string" ? product.imageUrl.trim() : "";
  const category = typeof product.category === "string" ? product.category.trim() : "";
  const slug = typeof product.slug === "string" ? product.slug.trim() : "";
  const routeSlug = typeof product.routeSlug === "string" ? product.routeSlug.trim() : "";

  if (!name || !imageUrl || !category || !slug || !routeSlug) {
    return null;
  }

  return {
    name,
    imageUrl,
    category,
    slug,
    price: typeof product.price === "string" ? product.price.trim() : undefined,
    kcal: typeof product.kcal === "number" ? product.kcal : undefined,
    protein: typeof product.protein === "number" ? product.protein : undefined,
    fat: typeof product.fat === "number" ? product.fat : undefined,
    carbs: typeof product.carbs === "number" ? product.carbs : undefined,
    routeSlug,
    brand:
      typeof product.brand === "string" && product.brand.trim().length > 0
        ? product.brand.trim()
        : null,
    source:
      product.source === "open_food_facts" ? "open_food_facts" : "catalog",
    sourceLabel:
      typeof product.sourceLabel === "string" && product.sourceLabel.trim().length > 0
        ? product.sourceLabel.trim()
        : null,
    sourceUrl:
      typeof product.sourceUrl === "string" && product.sourceUrl.trim().length > 0
        ? product.sourceUrl.trim()
        : null,
  };
}

export default function ProductPage() {
  const {
    ratings,
    comments,
    commentDrafts,
    submittingComments,
    commentErrors,
    saveRating,
    deleteRating,
    deleteComment,
    updateCommentDraft,
    submitComment,
    user,
  } = useUserRatings();

  const {
    isFavorite,
    isWantToTry,
    isTried,
    toggleFavorite,
    toggleWantToTry,
    toggleTried,
    isUpdating,
    error: listError,
    listTypes,
  } = useUserProductLists();
  const {
    customLists,
    loaded: customListsLoaded,
    creatingList,
    error: customListsError,
    createCustomList,
    setProductInCustomList,
    isProductInCustomList,
    isUpdatingItem,
  } = useUserCustomLists();

  const params = useParams<{ slug: string }>();
  const routeSlug = params?.slug || "";

  const localProduct = useMemo(
    () => ALL_PRODUCTS.find((item) => getProductRouteSlug(item) === routeSlug) ?? null,
    [routeSlug]
  );

  const [details, setDetails] = useState<Partial<ProductDetailsPayload> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsReloadToken, setDetailsReloadToken] = useState(0);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);
  const [customListInput, setCustomListInput] = useState("");
  const [customListMessage, setCustomListMessage] = useState<string | null>(null);
  const [selectedCustomListId, setSelectedCustomListId] = useState("");
  const [isCustomListCreatorOpen, setIsCustomListCreatorOpen] = useState(false);
  const [isEditingOwnComment, setIsEditingOwnComment] = useState(false);
  const [isOwnCommentMenuOpen, setIsOwnCommentMenuOpen] = useState(false);
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Record<string, boolean>>({});
  const [activeReplyEditorReviewId, setActiveReplyEditorReviewId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string | null>>({});
  const [submittingReplies, setSubmittingReplies] = useState<Record<string, boolean>>({});
  const [deletingReplyIds, setDeletingReplyIds] = useState<Record<string, boolean>>({});
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const [selectedPriceOptionId, setSelectedPriceOptionId] = useState<string | null>(null);
  const [selectedNutritionOptionId, setSelectedNutritionOptionId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const ownCommentMenuRef = useRef<HTMLDivElement | null>(null);
  const replyHashHandledRef = useRef<string | null>(null);
  const remoteProduct = useMemo(
    () => normalizeProductPayload((details as { product?: unknown } | null)?.product),
    [details]
  );
  const product = useMemo<ProductPayload | null>(() => {
    if (localProduct) {
      return {
        ...localProduct,
        routeSlug,
        brand: null,
        source: "catalog",
        sourceLabel: null,
        sourceUrl: null,
      };
    }

    return remoteProduct;
  }, [localProduct, remoteProduct, routeSlug]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      if (!routeSlug) {
        setDetails(null);
        setDetailsLoading(false);
        return;
      }

      setDetails(null);
      setDetailsLoading(true);

      try {
        const response = await fetch(`/api/product-details/${routeSlug}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const json = (await response.json()) as Partial<ProductDetailsPayload>;
        if (cancelled) return;

        setDetails(json);
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [routeSlug, detailsReloadToken]);

  const savedComment = (comments[routeSlug] || "").trim();
  const commentDraft = commentDrafts[routeSlug] || "";
  const trimmedCommentDraft = commentDraft.trim();
  const isCommentLongEnough = trimmedCommentDraft.length >= MIN_COMMENT_LENGTH;
  const hasSavedComment = savedComment.length > 0;
  const showCommentEditor = !user || !hasSavedComment || isEditingOwnComment;

  useEffect(() => {
    setIsEditingOwnComment(false);
    setIsOwnCommentMenuOpen(false);
    setExpandedReplyThreads({});
    setActiveReplyEditorReviewId(null);
    setReplyDrafts({});
    setReplyErrors({});
    setSubmittingReplies({});
    setDeletingReplyIds({});
    replyHashHandledRef.current = null;
    setIsIngredientsOpen(false);
    setIsNutritionOpen(false);
  }, [routeSlug]);

  useEffect(() => {
    if (!hasSavedComment) {
      setIsEditingOwnComment(false);
      setIsOwnCommentMenuOpen(false);
    }
  }, [hasSavedComment]);

  useEffect(() => {
    if (!isOwnCommentMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        ownCommentMenuRef.current &&
        event.target instanceof Node &&
        !ownCommentMenuRef.current.contains(event.target)
      ) {
        setIsOwnCommentMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOwnCommentMenuOpen]);

  const fallback = product ? createFallbackDetails(product) : null;
  const mergedDetails = useMemo(
    () => (fallback ? mergeDetails(fallback, details) : null),
    [fallback, details]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !mergedDetails) {
      return;
    }

    const hash = window.location.hash.replace(/^#/, "").trim();
    if (!hash.startsWith("review-")) {
      return;
    }

    if (replyHashHandledRef.current === hash) {
      return;
    }

    const reviewUserId = decodeURIComponent(hash.slice("review-".length)).trim();
    if (!reviewUserId) {
      return;
    }

    const targetComment = mergedDetails.kommentare.find(
      (comment) => comment.reviewUserId === reviewUserId
    );

    if (!targetComment) {
      return;
    }

    setExpandedReplyThreads((prev) => ({ ...prev, [reviewUserId]: true }));
    replyHashHandledRef.current = hash;

    if (user && !targetComment.isOwnComment) {
      setActiveReplyEditorReviewId(reviewUserId);
    }
  }, [mergedDetails, user]);

  useEffect(() => {
    const nextPriceOptionId = mergedDetails?.preisOptionen?.[0]?.id ?? null;
    setSelectedPriceOptionId((current) => {
      if (!mergedDetails?.preisOptionen?.length) {
        return null;
      }

      return mergedDetails.preisOptionen.some((option) => option.id === current)
        ? current
        : nextPriceOptionId;
    });
  }, [mergedDetails?.preisOptionen, routeSlug]);

  useEffect(() => {
    const nextNutritionOptionId = mergedDetails?.naehrwertOptionen?.[0]?.id ?? null;
    setSelectedNutritionOptionId((current) => {
      if (!mergedDetails?.naehrwertOptionen?.length) {
        return null;
      }

      return mergedDetails.naehrwertOptionen.some((option) => option.id === current)
        ? current
        : nextNutritionOptionId;
    });
  }, [mergedDetails?.naehrwertOptionen, routeSlug]);

  useEffect(() => {
    if (customLists.length === 0) {
      if (selectedCustomListId) {
        setSelectedCustomListId("");
      }
      return;
    }

    const hasSelectedList = customLists.some((list) => list.id === selectedCustomListId);
    if (hasSelectedList) {
      return;
    }

    const firstActiveList =
      customLists.find((list) => list.items.some((item) => item.productSlug === routeSlug)) ||
      customLists[0];

    setSelectedCustomListId(firstActiveList?.id || "");
  }, [customLists, routeSlug, selectedCustomListId]);

  const initialReviewLikes = useMemo(
    () =>
      (mergedDetails?.kommentare ?? [])
        .filter(
          (comment): comment is ProductComment & { reviewUserId: string } =>
            typeof comment.reviewUserId === "string" && comment.reviewUserId.length > 0
        )
        .map((comment) => ({
          reviewUserId: comment.reviewUserId,
          productSlug: routeSlug,
          likeCount: comment.likeCount,
          viewerLiked: comment.viewerLiked,
        })),
    [mergedDetails?.kommentare, routeSlug]
  );
  const {
    error: reviewLikesError,
    getReviewLikeState,
    toggleReviewLike,
    isUpdating: isUpdatingReviewLike,
  } = useReviewLikes(initialReviewLikes);

  function openReplyEditor(reviewUserId: string) {
    if (!user) {
      alert("Bitte einloggen!");
      return;
    }

    setExpandedReplyThreads((prev) => ({ ...prev, [reviewUserId]: true }));
    setActiveReplyEditorReviewId(reviewUserId);
    setReplyErrors((prev) => ({ ...prev, [reviewUserId]: null }));
  }

  async function submitReply(reviewUserId: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } satisfies ReviewReplyResponse;
    }

    const draft = (replyDrafts[reviewUserId] || "").trim();
    if (!draft) {
      const error = "Bitte schreibe erst eine Antwort.";
      setReplyErrors((prev) => ({ ...prev, [reviewUserId]: error }));

      return {
        success: false,
        error,
      } satisfies ReviewReplyResponse;
    }

    setSubmittingReplies((prev) => ({ ...prev, [reviewUserId]: true }));
    setReplyErrors((prev) => ({ ...prev, [reviewUserId]: null }));

    try {
      const response = await fetch("/api/review-replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productSlug: routeSlug,
          reviewUserId,
          text: draft,
        }),
      });

      const json = (await response.json()) as ReviewReplyResponse;

      if (!response.ok || !json.success) {
        const error = json.error || "Antwort konnte nicht gesendet werden.";
        setReplyErrors((prev) => ({ ...prev, [reviewUserId]: error }));

        return {
          success: false,
          error,
        } satisfies ReviewReplyResponse;
      }

      setReplyDrafts((prev) => ({ ...prev, [reviewUserId]: "" }));
      setReplyErrors((prev) => ({ ...prev, [reviewUserId]: null }));
      setExpandedReplyThreads((prev) => ({ ...prev, [reviewUserId]: true }));
      setActiveReplyEditorReviewId((current) =>
        current === reviewUserId ? null : current
      );
      setDetailsReloadToken((prev) => prev + 1);

      return json;
    } catch {
      const error = "Antwort konnte nicht gesendet werden.";
      setReplyErrors((prev) => ({ ...prev, [reviewUserId]: error }));

      return {
        success: false,
        error,
      } satisfies ReviewReplyResponse;
    } finally {
      setSubmittingReplies((prev) => ({ ...prev, [reviewUserId]: false }));
    }
  }

  async function deleteReply(replyId: number, reviewUserId: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } satisfies ReviewReplyResponse;
    }

    const replyKey = String(replyId);
    setDeletingReplyIds((prev) => ({ ...prev, [replyKey]: true }));
    setReplyErrors((prev) => ({ ...prev, [reviewUserId]: null }));

    try {
      const response = await fetch(`/api/review-replies/${replyId}`, {
        method: "DELETE",
      });

      const json = (await response.json()) as ReviewReplyResponse;

      if (!response.ok || !json.success) {
        const error = json.error || "Antwort konnte nicht gelöscht werden.";
        setReplyErrors((prev) => ({ ...prev, [reviewUserId]: error }));

        return {
          success: false,
          error,
        } satisfies ReviewReplyResponse;
      }

      setDetailsReloadToken((prev) => prev + 1);
      return json;
    } catch {
      const error = "Antwort konnte nicht gelöscht werden.";
      setReplyErrors((prev) => ({ ...prev, [reviewUserId]: error }));

      return {
        success: false,
        error,
      } satisfies ReviewReplyResponse;
    } finally {
      setDeletingReplyIds((prev) => ({ ...prev, [replyKey]: false }));
    }
  }

  function handleStartEditingOwnComment() {
    updateCommentDraft(routeSlug, savedComment);
    setIsEditingOwnComment(true);
    setIsOwnCommentMenuOpen(false);
    setCommentMessage(null);
  }

  async function handleDeleteOwnComment() {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Möchtest du deinen Kommentar wirklich löschen?");
      if (!confirmed) {
        return;
      }
    }

    const response = await deleteComment(routeSlug);
    if (!response.success) {
      setCommentMessage(response.error || "Kommentar konnte nicht gelöscht werden.");
      return;
    }

    setIsEditingOwnComment(false);
    setIsOwnCommentMenuOpen(false);
    setCommentMessage("Kommentar erfolgreich gelöscht.");
    setDetailsReloadToken((prev) => prev + 1);
  }

  if (!routeSlug) return null;

  if (detailsLoading && !product) {
    return (
      <div className="-mt-2 max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-[30px] border border-[#2D3A4B] bg-[linear-gradient(145deg,rgba(27,34,45,0.98),rgba(15,22,32,0.96))] p-8 text-center shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
          <h1 className="mb-4 text-3xl font-bold">Produkt wird geladen</h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#AFC1D3] sm:text-base">
            Wir prüfen gerade den Katalog und erweitern die Suche bei Bedarf mit Open
            Food Facts.
          </p>
        </div>
      </div>
    );
  }

  if (!product || !mergedDetails) {
    const suggestionName = humanizeRouteSlug(routeSlug);

    return (
      <div className="-mt-2 max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-[30px] border border-[#2D3A4B] bg-[linear-gradient(145deg,rgba(27,34,45,0.98),rgba(15,22,32,0.96))] p-8 text-center shadow-[0_18px_44px_rgba(0,0,0,0.28)]">
          <h1 className="mb-4 text-3xl font-bold">Produkt nicht gefunden</h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-[#AFC1D3] sm:text-base">
            Wenn dieses Produkt noch nicht im Katalog ist, kannst du es direkt vorschlagen
            oder selbst einreichen. Mit Name, Marke oder Shop-Link können wir es schneller
            aufnehmen.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={{
                pathname: "/produkt-vorschlagen",
                query: suggestionName ? { name: suggestionName, from: "produktseite" } : { from: "produktseite" },
              }}
              className="inline-flex items-center rounded-full bg-[#5EE287] px-5 py-3 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C]"
            >
              Produkt vorschlagen
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-[#2D3A4B] bg-[#121B27] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
            >
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const favoriteActive = isFavorite(routeSlug);
  const wantToTryActive = isWantToTry(routeSlug);
  const triedActive = isTried(routeSlug);
  const sourceLabel = product.sourceLabel?.trim() || "Open Food Facts";
  const sourceUrl = product.source === "open_food_facts" ? product.sourceUrl?.trim() || null : null;

  const originalImageUrl = getProductImageUrl(product);
  const buyLink = getProductBuyLink(product);
  const cachedImageUrl = `/api/product-image/${routeSlug}`;

  const displayCategory = !isPlaceholderValue(mergedDetails.kategorie) ? mergedDetails.kategorie : product.category;
  const displayBrand = !isPlaceholderValue(mergedDetails.marke) ? mergedDetails.marke : null;
  const categoryAccent = getCategoryAccent(displayCategory);
  const averageRatingValue = isPlaceholderValue(mergedDetails.durchschnittsbewertung)
    ? null
    : parseRatingValue(mergedDetails.durchschnittsbewertung);
  const similarProducts = mergedDetails.aehnlicheProdukte || [];
  const hasCoRatedSimilarProducts = similarProducts.some((item) => item.overlapCount > 0);
  const userRatingValue = ratings[routeSlug] || 0;
  const hasUserRating = userRatingValue > 0;
  const priceOptions = mergedDetails.preisOptionen || [];
  const activePriceOption =
    priceOptions.find((option) => option.id === selectedPriceOptionId) || priceOptions[0] || null;
  const nutritionOptions = mergedDetails.naehrwertOptionen || [];
  const activeNutritionOption =
    nutritionOptions.find((option) => option.id === selectedNutritionOptionId) ||
    nutritionOptions[0] ||
    null;
  const activeNutritionValues = activeNutritionOption?.values || mergedDetails.naehrwerte;
  const activeCustomLists = customLists.filter((list) =>
    list.items.some((item) => item.productSlug === routeSlug)
  );
  const selectedCustomList =
    customLists.find((list) => list.id === selectedCustomListId) || null;
  const selectedCustomListActive = selectedCustomList
    ? isProductInCustomList(selectedCustomList.id, routeSlug)
    : false;
  const selectedCustomListUpdating = selectedCustomList
    ? isUpdatingItem(selectedCustomList.id, routeSlug)
    : false;

  const keyFacts: Array<[string, string | number]> = [
    ["Kategorie", displayCategory || product.category],
    ["Marke", mergedDetails.marke],
    ["Gewicht", mergedDetails.gewicht],
    ["Preis", activePriceOption?.value || mergedDetails.preis],
  ];

  const nutritionFacts: Array<[string, string | number]> = [
    ["Kalorien", activeNutritionValues.kcal],
    ["Protein", activeNutritionValues.protein],
    ["Fett", activeNutritionValues.fat],
    ["Kohlenhydrate", activeNutritionValues.carbs],
  ];

  if (!isPlaceholderValue(activeNutritionValues.energyKj)) {
    nutritionFacts.unshift(["Energie", activeNutritionValues.energyKj as string | number]);
  }

  if (!isPlaceholderValue(activeNutritionValues.saturatedFat)) {
    nutritionFacts.push([
      "davon gesättigte Fettsäuren",
      activeNutritionValues.saturatedFat as string | number,
    ]);
  }

  if (!isPlaceholderValue(activeNutritionValues.sugar)) {
    nutritionFacts.push(["davon Zucker", activeNutritionValues.sugar as string | number]);
  }

  if (!isPlaceholderValue(activeNutritionValues.ballaststoffe)) {
    nutritionFacts.push(["Ballaststoffe", activeNutritionValues.ballaststoffe as string | number]);
  }

  if (!isPlaceholderValue(activeNutritionValues.salz)) {
    nutritionFacts.push(["Salz", activeNutritionValues.salz as string | number]);
  }

  if (!isPlaceholderValue(activeNutritionValues.polyole)) {
    nutritionFacts.push(["Mehrwertige Alkohole", activeNutritionValues.polyole as string | number]);
  }

  if (!isPlaceholderValue(activeNutritionValues.koffein)) {
    nutritionFacts.push(["Koffein", activeNutritionValues.koffein as string | number]);
  }

  if (!isPlaceholderValue(activeNutritionValues.glucomannan)) {
    nutritionFacts.push(["Glucomannan", activeNutritionValues.glucomannan as string | number]);
  }

  const aminoAcidProfile = Array.isArray(mergedDetails.aminosaeurenprofil)
    ? mergedDetails.aminosaeurenprofil.filter(
        (entry): entry is AminoAcidEntry =>
          Boolean(entry) &&
          typeof entry.name === "string" &&
          entry.name.trim().length > 0 &&
          typeof entry.amount === "string" &&
          entry.amount.trim().length > 0
      )
    : [];

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = { title: product?.name || "FoodRanker", url };

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // fall through to clipboard
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  async function handleCreateCustomList() {
    const createResponse = await createCustomList(customListInput);

    if (!createResponse.success || !createResponse.data) {
      return;
    }

    const addResponse = await setProductInCustomList(
      createResponse.data.id,
      routeSlug,
      true
    );

    if (!addResponse.success) {
      return;
    }

    setCustomListInput("");
    setSelectedCustomListId(createResponse.data.id);
    setIsCustomListCreatorOpen(false);
    setCustomListMessage(
      `Liste "${createResponse.data.name}" erstellt und Produkt hinzugefügt.`
    );
  }

  async function handleSelectedCustomListToggle() {
    if (!selectedCustomList) {
      return;
    }

    const response = await setProductInCustomList(
      selectedCustomList.id,
      routeSlug,
      !selectedCustomListActive
    );

    if (!response.success) {
      return;
    }

    setCustomListMessage(
      selectedCustomListActive
        ? `Aus "${selectedCustomList.name}" entfernt.`
        : `Zu "${selectedCustomList.name}" hinzugefügt.`
    );
  }

  return (
    <div className="-mt-2 max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#E8F6ED]">
                {product.name}
              </h1>

              <div className="inline-flex w-fit items-center gap-3 rounded-[22px] border border-[#314254] bg-[linear-gradient(135deg,rgba(18,28,41,0.96),rgba(12,19,30,0.92))] px-4 py-3 shadow-[0_16px_34px_rgba(0,0,0,0.24)]">
                <div className="flex flex-col">
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[#9AB0C6]">
                    Community
                  </span>
                  {averageRatingValue !== null ? (
                    <div className="mt-1 flex items-center gap-3">
                      <ReadOnlyRatingStars rating={averageRatingValue} />
                      <span className="text-lg font-bold text-[#F6F8FB]">
                        {formatRatingValue(averageRatingValue)}/5
                      </span>
                    </div>
                  ) : (
                    <span className="mt-1 text-sm font-semibold text-[#D6E2EF]">
                      Noch keine Bewertung
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-[#9EB0C3]">
              Auf einen Blick sehen, wie die Community dieses Produkt bewertet.
            </p>

            {sourceUrl ? (
              <p className="text-xs text-[#8CA1B8]">
                Daten via{" "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#8AF5AC] transition-colors hover:text-[#B7FFD0]"
                >
                  {sourceLabel}
                </a>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {buyLink ? (
              <BuyButton
                href={buyLink.url}
                sourceLabel={buyLink.sourceLabel}
                productName={product.name}
              />
            ) : null}
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:border-[#5EE287] hover:text-[#D9FFE6]"
            >
              {shareCopied ? (
                <>
                  <svg className="h-4 w-4 text-[#8AF5AC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[#8AF5AC]">Link kopiert!</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                  <span>Teilen</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="group lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-[34px] border border-[#314254] bg-[radial-gradient(circle_at_top,rgba(124,200,255,0.16),transparent_48%),radial-gradient(circle_at_bottom,rgba(94,226,135,0.16),transparent_42%),linear-gradient(160deg,rgba(26,35,47,0.98),rgba(17,24,36,0.96))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.34)] sm:p-6">
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-[28px] border border-[#3A4B5D] bg-[linear-gradient(180deg,rgba(31,42,56,0.94),rgba(18,25,37,0.98))] px-2 py-2 sm:px-4 sm:py-4">
                  <div className="pointer-events-none absolute -left-6 -top-6 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(124,200,255,0.22),transparent_68%)] blur-3xl sm:h-52 sm:w-52" />
                  <div className="pointer-events-none absolute left-10 top-20 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(94,226,135,0.18),transparent_72%)] blur-3xl sm:h-32 sm:w-32" />
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_68%)] blur-2xl" />
                  <div className="pointer-events-none absolute bottom-6 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.34),transparent_72%)] blur-2xl" />

                  <div className="flex min-h-[300px] items-center justify-center px-3 py-6 sm:min-h-[360px] sm:px-4">
                    <img
                      src={cachedImageUrl}
                      className="relative z-[1] h-full min-h-[300px] max-h-[420px] w-full object-contain drop-shadow-[0_26px_46px_rgba(0,0,0,0.42)] transition-transform duration-500 group-hover:scale-[1.04]"
                      alt={product.name}
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
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,22,33,0.88),rgba(15,22,33,0.5))] shadow-[0_18px_32px_rgba(0,0,0,0.24)] backdrop-blur-md">
                  <div className={`h-1.5 w-full ${categoryAccent.accentBarClass}`} />
                  <div className="space-y-3 px-4 py-3.5">
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#94A9BF]">
                      Produktansicht
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${categoryAccent.badgeClass}`}
                      >
                        {displayCategory || product.category}
                      </span>
                      {displayBrand ? (
                        <span className="inline-flex items-center rounded-full border border-[#41556A] bg-[#13202C]/88 px-2.5 py-1 text-[0.68rem] font-semibold text-[#DCE7F3]">
                          {displayBrand}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold leading-snug text-[#F1F7FD]">
                      Verpackung, Marke und Kategorie sofort im Blick.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#E8F6ED]">Produktdetails</h2>
                <SegmentToggle
                  options={priceOptions}
                  activeId={activePriceOption?.id || null}
                  onChange={setSelectedPriceOptionId}
                />
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 text-[#C4D0DE]">
                {keyFacts.map(([key, value]) => (
                  <li key={key} className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                    <strong className="text-white">{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#2D3A4B] bg-[#141C27]">
              <button
                type="button"
                onClick={() => setIsIngredientsOpen((current) => !current)}
                aria-expanded={isIngredientsOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#18212D]"
              >
                <h2 className="text-xl font-semibold text-[#E8F6ED]">Zutaten</h2>
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className={`h-5 w-5 text-[#8CA1B8] transition-transform ${
                    isIngredientsOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                >
                  <path
                    d="M5 8l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isIngredientsOpen ? (
                <div className="border-t border-[#2D3A4B] px-4 py-4">
                  <p className="text-[#C4D0DE] text-sm leading-relaxed">
                    {mergedDetails.zutaten}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#2D3A4B] bg-[#141C27]">
              <button
                type="button"
                onClick={() => setIsNutritionOpen((current) => !current)}
                aria-expanded={isNutritionOpen}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#18212D]"
              >
                <h2 className="text-xl font-semibold text-[#E8F6ED]">Nährwerte</h2>
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className={`h-5 w-5 text-[#8CA1B8] transition-transform ${
                    isNutritionOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                >
                  <path
                    d="M5 8l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {isNutritionOpen ? (
                <div className="border-t border-[#2D3A4B] px-4 py-4 [&>h2]:hidden">
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Nährwerte</h2>
              <div className="mb-3 flex flex-wrap justify-end gap-3">
                <SegmentToggle
                  options={nutritionOptions}
                  activeId={activeNutritionOption?.id || null}
                  onChange={setSelectedNutritionOptionId}
                />
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 text-[#C4D0DE]">
                {nutritionFacts.map(([label, value]) => (
                  <li key={label} className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                    <strong className="text-white">{label}:</strong> {value}
                  </li>
                ))}
              </ul>
              {activeNutritionOption ? (
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
                  {activeNutritionOption.label}
                </p>
              ) : null}
              {detailsLoading && <p className="text-xs text-[#8CA1B8] mt-2">Lade Produktdaten...</p>}
                </div>
              ) : null}
            </section>

            {aminoAcidProfile.length > 0 && (
              <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-semibold text-[#E8F6ED]">Aminosäurebilanz</h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8CA1B8]">
                      pro 100 g Protein
                    </p>
                  </div>
                </div>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {aminoAcidProfile.map((entry) => (
                    <li
                      key={`${entry.name}-${entry.amount}`}
                      className="rounded-lg border border-[#2D3A4B] bg-[#141C27] px-3 py-2 text-sm text-[#C4D0DE]"
                    >
                      <strong className="text-white">{entry.name}:</strong> {entry.amount}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {similarProducts.length > 0 ? (
              <section>
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#E8F6ED]">Ähnliche Produkte</h2>
                    <p className="text-sm text-[#8CA1B8]">
                      {hasCoRatedSimilarProducts
                        ? "Von Nutzern ebenfalls bewertet."
                        : `Beliebt in ${displayCategory || product.category}.`}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {similarProducts.map((similarProduct) => {
                    const similarAccent = getCategoryAccent(similarProduct.category);

                    return (
                      <Link
                        key={similarProduct.slug}
                        href={`/produkt/${similarProduct.slug}`}
                        className={`group rounded-[24px] border border-[#2D3A4B] bg-[#141C27] p-3 transition-colors ${similarAccent.cardClass}`}
                      >
                        <div className={`mb-3 h-1 rounded-full ${similarAccent.accentBarClass}`} />
                        <div className="flex gap-3">
                          <div
                            className={`relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border bg-[#0F1722] ${similarAccent.thumbClass}`}
                          >
                            <img
                              src={`/api/product-image/${similarProduct.slug}`}
                              alt={similarProduct.name}
                              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
                              loading="lazy"
                              decoding="async"
                              onError={(event) => {
                                const image = event.currentTarget;
                                if (image.dataset.fallbackApplied === "1") {
                                  image.src = getCategoryPlaceholderImage(similarProduct.category);
                                  return;
                                }
                                image.dataset.fallbackApplied = "1";
                                image.src =
                                  getProductImageUrl({ imageUrl: similarProduct.imageUrl }) ===
                                  "/images/placeholders/product-default.svg"
                                    ? getCategoryPlaceholderImage(similarProduct.category)
                                    : getProductImageUrl({ imageUrl: similarProduct.imageUrl });
                              }}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold ${similarAccent.badgeClass}`}
                              >
                                {similarProduct.category}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-[#2D3A4B] bg-[#101925] px-2.5 py-1 text-[0.65rem] font-semibold text-[#C7D5E3]">
                                {similarProduct.overlapCount > 0
                                  ? `${similarProduct.overlapCount} gemeinsame Ratings`
                                  : `${similarProduct.ratingCount} Bewertungen`}
                              </span>
                            </div>

                            <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-[#E8F6ED]">
                              {similarProduct.name}
                            </h3>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {similarProduct.averageRating !== null ? (
                                <>
                                  <ReadOnlyRatingStars rating={similarProduct.averageRating} />
                                  <span className="rounded-full border border-[#3B4E64] bg-[#101925] px-2.5 py-1 text-xs font-semibold text-[#F6F8FB]">
                                    {formatRatingValue(similarProduct.averageRating)}/5
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-[#8CA1B8]">Noch keine Bewertung</span>
                              )}
                            </div>

                            {similarProduct.price ? (
                              <p className="mt-2 text-sm text-[#AFC1D3]">{similarProduct.price}</p>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Kommentare</h2>

              {mergedDetails.kommentare.length > 0 ? (
                <ul className="space-y-3">
                  {mergedDetails.kommentare.map((comment, index) => (
                    <li
                      id={comment.reviewUserId ? `review-${comment.reviewUserId}` : undefined}
                      key={`${comment.username}-${comment.updatedAt || index}-${comment.text}`}
                      className={`group rounded-xl border px-3 py-3 transition-colors ${
                        comment.isOwnComment
                          ? "border-[#5EE287] bg-[linear-gradient(135deg,rgba(94,226,135,0.15),rgba(20,28,39,0.96))] shadow-[0_12px_30px_rgba(34,197,94,0.12)]"
                          : "border-[#2D3A4B] bg-[#141C27]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p
                              className={`text-xs uppercase tracking-[0.22em] ${
                                comment.isOwnComment ? "text-[#D9FFE6]" : "text-[#8CA1B8]"
                              }`}
                            >
                              {comment.username}
                            </p>
                            {comment.isOwnComment && (
                              <span className="rounded-full border border-[#5EE287]/40 bg-[#5EE287]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8AF5AC]">
                                Dein Kommentar
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm leading-relaxed ${
                              comment.isOwnComment
                                ? "text-[#F3FFF6] [text-align:justify]"
                                : "text-[#C4D0DE] [text-align:justify]"
                            }`}
                          >
                            {comment.text}
                          </p>

                          {comment.reviewUserId ? (
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <ReviewLikeButton
                                active={
                                  getReviewLikeState(comment.reviewUserId, routeSlug)
                                    .viewerLiked
                                }
                                count={
                                  getReviewLikeState(comment.reviewUserId, routeSlug)
                                    .likeCount
                                }
                                disabled={
                                  !user ||
                                  comment.isOwnComment ||
                                  isUpdatingReviewLike(comment.reviewUserId, routeSlug)
                                }
                                onClick={() => {
                                  void toggleReviewLike(comment.reviewUserId!, routeSlug);
                                }}
                              />

                              {!comment.isOwnComment ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    openReplyEditor(comment.reviewUserId!);
                                  }}
                                  className="inline-flex items-center rounded-full border border-[#35506A] bg-[#132132] px-3 py-2 text-xs font-semibold text-[#D9ECFF] transition-colors hover:border-[#7CC8FF] hover:text-white"
                                >
                                  Antworten
                                </button>
                              ) : null}

                              {comment.replyCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedReplyThreads((prev) => ({
                                      ...prev,
                                      [comment.reviewUserId!]: !prev[comment.reviewUserId!],
                                    }));
                                  }}
                                  className="inline-flex items-center rounded-full border border-[#2D3A4B] bg-[#111823] px-3 py-2 text-xs font-semibold text-[#D6E2EF] transition-colors hover:border-[#5EE287] hover:text-white"
                                >
                                  {expandedReplyThreads[comment.reviewUserId]
                                    ? `${comment.replyCount} ${
                                        comment.replyCount === 1
                                          ? "Antwort ausblenden"
                                          : "Antworten ausblenden"
                                      }`
                                    : `${comment.replyCount} ${
                                        comment.replyCount === 1
                                          ? "Antwort anzeigen"
                                          : "Antworten anzeigen"
                                      }`}
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          {comment.reviewUserId &&
                          (comment.replies.length > 0 ||
                            activeReplyEditorReviewId === comment.reviewUserId ||
                            replyErrors[comment.reviewUserId]) &&
                          (expandedReplyThreads[comment.reviewUserId] === true ||
                            activeReplyEditorReviewId === comment.reviewUserId ||
                            Boolean(replyErrors[comment.reviewUserId])) ? (
                            <div className="mt-4 rounded-[20px] border border-[#2A394B] bg-[#0F1722]/92 p-3 sm:p-4">
                              {comment.replies.length > 0 ? (
                                <ul className="space-y-3">
                                  {comment.replies.map((reply, replyIndex) => (
                                    <li
                                      key={`${reply.id ?? replyIndex}-${reply.updatedAt || replyIndex}-${reply.text}`}
                                      className={`rounded-2xl border px-3 py-3 ${
                                        reply.isOwnReply
                                          ? "border-[#4D7E61] bg-[linear-gradient(135deg,rgba(94,226,135,0.12),rgba(18,25,35,0.96))]"
                                          : "border-[#2D3A4B] bg-[#111823]"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8CA1B8]">
                                              {reply.username}
                                            </p>
                                            {reply.isOwnReply ? (
                                              <span className="rounded-full border border-[#5EE287]/35 bg-[#173023] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D9FFE6]">
                                                Deine Antwort
                                              </span>
                                            ) : null}
                                          </div>
                                          <p className="text-sm leading-relaxed text-[#D3DFEB] [text-align:justify]">
                                            {reply.text}
                                          </p>
                                        </div>

                                        {reply.isOwnReply && reply.id !== null ? (
                                          <button
                                            type="button"
                                            className="shrink-0 rounded-full border border-[#5B3030] bg-[#261315] px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-[#31181B] disabled:cursor-not-allowed disabled:opacity-60"
                                            disabled={deletingReplyIds[String(reply.id)] === true}
                                            onClick={() => {
                                              void deleteReply(reply.id!, comment.reviewUserId!);
                                            }}
                                          >
                                            {deletingReplyIds[String(reply.id)] ? "Lösche..." : "Löschen"}
                                          </button>
                                        ) : null}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}

                              {activeReplyEditorReviewId === comment.reviewUserId ? (
                                <div className={comment.replies.length > 0 ? "mt-4 border-t border-[#213042] pt-4" : ""}>
                                  <textarea
                                    className="min-h-28 w-full rounded-xl border border-[#2D3A4B] bg-[#141C27] p-3 text-sm text-white placeholder:text-[#8CA1B8]"
                                    placeholder={`Antwort an ${comment.username}`}
                                    maxLength={1000}
                                    value={replyDrafts[comment.reviewUserId] || ""}
                                    onChange={(event) => {
                                      setReplyDrafts((prev) => ({
                                        ...prev,
                                        [comment.reviewUserId!]: event.target.value.slice(0, 1000),
                                      }));
                                      setReplyErrors((prev) => ({
                                        ...prev,
                                        [comment.reviewUserId!]: null,
                                      }));
                                    }}
                                    disabled={!user || submittingReplies[comment.reviewUserId] === true}
                                  />

                                  <div className="mt-3 flex items-center justify-between gap-3">
                                    <p className="text-xs text-[#8CA1B8]">
                                      {(replyDrafts[comment.reviewUserId] || "").length}/1000 Zeichen
                                    </p>

                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="rounded-lg border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={submittingReplies[comment.reviewUserId] === true}
                                        onClick={() => {
                                          setActiveReplyEditorReviewId((current) =>
                                            current === comment.reviewUserId ? null : current
                                          );
                                          setReplyErrors((prev) => ({
                                            ...prev,
                                            [comment.reviewUserId!]: null,
                                          }));
                                        }}
                                      >
                                        Abbrechen
                                      </button>

                                      <button
                                        type="button"
                                        className="rounded-lg bg-[#5EE287] px-4 py-2 text-sm font-semibold text-[#0C1910] transition-colors hover:bg-[#75F39B] disabled:cursor-not-allowed disabled:opacity-60"
                                        disabled={!user || submittingReplies[comment.reviewUserId] === true}
                                        onClick={() => {
                                          void submitReply(comment.reviewUserId!);
                                        }}
                                      >
                                        {submittingReplies[comment.reviewUserId]
                                          ? "Sende..."
                                          : "Antwort senden"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {replyErrors[comment.reviewUserId] ? (
                                <p className="mt-3 text-xs text-red-300">
                                  {replyErrors[comment.reviewUserId]}
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        {comment.isOwnComment && user && (
                          <div
                            ref={ownCommentMenuRef}
                            className="relative shrink-0 opacity-100 transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100"
                          >
                            <button
                              type="button"
                              aria-label="Kommentaroptionen öffnen"
                              aria-expanded={isOwnCommentMenuOpen}
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#5EE287]/25 bg-[#102116]/80 text-[#D9FFE6] transition-colors hover:bg-[#16301F] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={submittingComments[routeSlug] === true}
                              onClick={() => {
                                setIsOwnCommentMenuOpen((current) => !current);
                                setCommentMessage(null);
                              }}
                            >
                              <span className="sr-only">Kommentaroptionen öffnen</span>
                              <span className="flex flex-col items-center gap-0.5">
                                <span className="block h-1 w-1 rounded-full bg-current" />
                                <span className="block h-1 w-1 rounded-full bg-current" />
                                <span className="block h-1 w-1 rounded-full bg-current" />
                              </span>
                            </button>

                            {isOwnCommentMenuOpen && (
                              <div className="absolute right-0 top-12 z-20 min-w-[180px] rounded-2xl border border-[#2D3A4B] bg-[#0F1722] p-2 shadow-[0_18px_42px_rgba(0,0,0,0.38)]">
                                <button
                                  type="button"
                                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#D9FFE6] transition-colors hover:bg-[#173023] disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={submittingComments[routeSlug] === true}
                                  onClick={() => {
                                    handleStartEditingOwnComment();
                                  }}
                                >
                                  Bearbeiten
                                </button>

                                <button
                                  type="button"
                                  className="mt-1 flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-200 transition-colors hover:bg-[#2A1111] disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={submittingComments[routeSlug] === true}
                                  onClick={async () => {
                                    const response = await deleteComment(routeSlug);
                                    if (!response.success) {
                                      setCommentMessage(response.error || "Kommentar konnte nicht gelöscht werden.");
                                      return;
                                    }

                                    setIsEditingOwnComment(false);
                                    setIsOwnCommentMenuOpen(false);
                                    setCommentMessage("Kommentar erfolgreich gelöscht.");
                                    setDetailsReloadToken((prev) => prev + 1);
                                  }}
                                >
                                  {submittingComments[routeSlug] ? "Lösche..." : "Löschen"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2 text-sm text-[#8CA1B8]">
                  Noch keine Kommentare vorhanden.
                </p>
              )}

              {reviewLikesError ? (
                <p className="mt-3 text-xs text-red-300">{reviewLikesError}</p>
              ) : null}
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Bewerten</h2>

              {!user && (
                <p className="text-sm text-[#8CA1B8] mb-3">
                  Bitte logge dich ein, um zu bewerten, Favoriten zu setzen, Produkte als probiert abzuhaken und Listen zu speichern.
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  disabled={!user || isUpdating(listTypes.FAVORITES, routeSlug)}
                  onClick={async () => {
                    if (!user) return alert("Bitte einloggen!");

                    const wasFavorite = favoriteActive;
                    const response = await toggleFavorite(routeSlug);

                    if (!response.success) return;

                    setListMessage(
                      wasFavorite ? "Aus Favoriten entfernt." : "Zu Favoriten hinzugefügt."
                    );
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    favoriteActive
                      ? "bg-[#5EE287] text-[#0C1910] border-[#5EE287]"
                      : "bg-[#141C27] text-white border-[#2D3A4B] hover:border-[#5EE287]"
                  }`}
                >
                  {favoriteActive ? "Favorit" : "Zu Favoriten"}
                </button>

                <button
                  type="button"
                  disabled={!user || isUpdating(listTypes.WANT_TO_TRY, routeSlug)}
                  onClick={async () => {
                    if (!user) return alert("Bitte einloggen!");

                    const wasWantToTry = wantToTryActive;
                    const response = await toggleWantToTry(routeSlug);

                    if (!response.success) return;

                    setListMessage(
                      wasWantToTry
                        ? "Aus Probieren-Liste entfernt."
                        : "Zur Probieren-Liste hinzugefügt."
                    );
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    wantToTryActive
                      ? "bg-[#F7D26B] text-[#251C04] border-[#F7D26B]"
                      : "bg-[#141C27] text-white border-[#2D3A4B] hover:border-[#F7D26B]"
                  }`}
                >
                  {wantToTryActive ? "Will ich probieren" : "Möchte ich probieren"}
                </button>

                <button
                  type="button"
                  disabled={!user || isUpdating(listTypes.TRIED, routeSlug)}
                  onClick={async () => {
                    if (!user) return alert("Bitte einloggen!");

                    const wasTried = triedActive;
                    const wasWantToTry = wantToTryActive;
                    const response = await toggleTried(routeSlug);

                    if (!response.success) return;

                    setListMessage(
                      wasTried
                        ? "Nicht mehr als probiert markiert."
                        : wasWantToTry
                          ? "Als probiert markiert und aus der Probieren-Liste entfernt."
                          : "Als probiert markiert."
                    );
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    triedActive
                      ? "bg-[#7CC8FF] text-[#0B1A26] border-[#7CC8FF]"
                      : "bg-[#141C27] text-white border-[#2D3A4B] hover:border-[#7CC8FF]"
                  }`}
                >
                  {triedActive ? "Bereits probiert" : "Als probiert abhaken"}
                </button>
              </div>

              {listError && <p className="text-xs text-red-300 mb-3">{listError}</p>}
              {listMessage && !listError && (
                <p className="text-xs text-[#8AF5AC] mb-3">{listMessage}</p>
              )}

              <div className="mb-5 rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">Eigene Listen</h3>
                    <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#AFC1D3]">
                      {!user
                        ? "Login"
                        : activeCustomLists.length > 0
                        ? `In ${activeCustomLists.length} Listen`
                        : customListsLoaded
                          ? `${customLists.length} Listen`
                          : "Listen"}
                    </span>
                  </div>

                  {!(customListsLoaded && customLists.length === 0) ? (
                    <button
                      type="button"
                      disabled={!user || creatingList}
                      onClick={() => {
                        setIsCustomListCreatorOpen((current) => !current);
                        setCustomListMessage(null);
                      }}
                      className="inline-flex items-center rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-2 text-xs font-semibold text-[#D6E2EF] transition-colors hover:border-[#5EE287] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                    {isCustomListCreatorOpen
                      ? "Neue Liste schließen"
                      : customLists.length === 0
                        ? "Erste Liste"
                        : "Neue Liste"}
                    </button>
                  ) : null}
                </div>

                {!customListsLoaded && (
                  <p className="mt-4 text-sm text-[#8CA1B8]">Eigene Listen werden geladen...</p>
                )}

                {customListsLoaded && user && customLists.length === 0 && !isCustomListCreatorOpen ? (
                  <button
                    type="button"
                    disabled={creatingList}
                    onClick={() => {
                      setIsCustomListCreatorOpen(true);
                      setCustomListMessage(null);
                    }}
                    className="mt-3 inline-flex items-center text-sm font-semibold text-[#8AF5AC] transition-colors hover:text-[#B7FFD0] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    + Erste Liste erstellen
                  </button>
                ) : null}

                {customListsLoaded && customLists.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <select
                        value={selectedCustomListId}
                        onChange={(event) => {
                          setSelectedCustomListId(event.target.value);
                          setCustomListMessage(null);
                        }}
                        disabled={!user || customLists.length === 0}
                        className="min-h-11 w-full appearance-none rounded-2xl border border-[#2D3A4B] bg-[#0C141E] px-4 py-3 pr-12 text-white outline-none transition-colors focus:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {customLists.map((list) => (
                          <option key={list.id} value={list.id}>
                            {list.name}
                            {isProductInCustomList(list.id, routeSlug) ? " · hinzugefügt" : ""}
                          </option>
                        ))}
                      </select>
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8CA1B8]"
                        fill="none"
                      >
                        <path
                          d="M5 8l5 5 5-5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <button
                      type="button"
                      disabled={!user || !selectedCustomList || selectedCustomListUpdating}
                      onClick={() => {
                        void handleSelectedCustomListToggle();
                      }}
                      className={`inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        selectedCustomListActive
                          ? "border border-[#2D3A4B] bg-[#141C27] text-white hover:border-[#7CC8FF]"
                          : "bg-[#5EE287] text-[#0C1910] hover:bg-[#79F29C]"
                      }`}
                    >
                      {!selectedCustomList
                        ? "Liste wählen"
                        : selectedCustomListUpdating
                          ? "Speichere..."
                          : selectedCustomListActive
                            ? "Entfernen"
                            : "Hinzufügen"}
                    </button>
                  </div>
                ) : null}

                {activeCustomLists.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCustomLists.map((list) => (
                      <span
                        key={list.id}
                        className="inline-flex items-center rounded-full border border-[#35503D] bg-[#132118] px-3 py-1 text-xs font-semibold text-[#D9FFE6]"
                      >
                        {list.name}
                      </span>
                    ))}
                  </div>
                ) : null}

                {isCustomListCreatorOpen ? (
                  <div className="mt-4 rounded-[22px] border border-[#223243] bg-[#0F1722] p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        value={customListInput}
                        maxLength={40}
                        onChange={(event) => {
                          setCustomListInput(event.target.value);
                          setCustomListMessage(null);
                        }}
                        placeholder="Neue Liste"
                        disabled={!user || creatingList}
                        className="min-h-11 w-full rounded-2xl border border-[#2D3A4B] bg-[#0C141E] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={!user || creatingList}
                        onClick={() => {
                          void handleCreateCustomList();
                        }}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingList ? "Erstelle..." : "Liste erstellen"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {(customListsError || customListMessage) && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${customListsError ? "border-[#6A3434] bg-[#2A1313] text-red-100" : "border-[#2D5B41] bg-[#173023] text-[#D9FFE6]"}`}>
                    {customListsError || customListMessage}
                  </div>
                )}

                {customListsLoaded && !user ? (
                  <p className="mt-4 rounded-[20px] border border-dashed border-[#35503D] bg-[#0F1722] px-4 py-3 text-sm text-[#AFC1D3]">
                    Einloggen für eigene Listen.
                  </p>
                ) : null}
              </div>

              <div className="mb-5 rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Deine Bewertung</h3>
                    <p className="mt-2 text-sm text-[#9EB0C3]">
                      {user
                        ? "Wähle 0,5 bis 5 Sterne. Deine Auswahl wird direkt gespeichert."
                        : "Logge dich ein, um dieses Produkt mit Sternen zu bewerten."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#3B4E64] bg-[#101925] px-3 py-1 text-xs font-semibold text-[#F6F8FB]">
                      {hasUserRating
                        ? `${formatRatingValue(userRatingValue)}/5 Sterne`
                        : "Noch nicht bewertet"}
                    </span>
                    {user ? (
                      <span className="rounded-full border border-[#2D5B41] bg-[#173023] px-3 py-1 text-xs font-semibold text-[#D9FFE6]">
                        Sofort gespeichert
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className={`inline-flex w-fit gap-1 rounded-2xl border border-[#2D3A4B] bg-[#141C27] px-3 py-2 ${!user ? "opacity-60" : ""}`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        rating={userRatingValue}
                        index={i}
                        onRate={(value) => {
                          if (!user) return alert("Bitte einloggen!");
                          setCommentMessage(null);
                          void saveRating(routeSlug, value);
                        }}
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs text-[#8CA1B8]">Halbe Sterne sind möglich.</p>
                    {hasUserRating ? (
                      <button
                        type="button"
                        className="rounded-lg border border-[#2D3A4B] bg-[#141C27] px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-[#7CC8FF] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!user || submittingComments[routeSlug] === true}
                        onClick={async () => {
                          setCommentMessage(null);
                          const response = await deleteRating(routeSlug);
                          if (!response.success) {
                            setCommentMessage(response.error || "Bewertung konnte nicht entfernt werden.");
                            return;
                          }

                          setCommentMessage("Bewertung entfernt.");
                          setDetailsReloadToken((prev) => prev + 1);
                        }}
                      >
                        {submittingComments[routeSlug] ? "Speichere..." : "Bewertung entfernen"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {showCommentEditor ? (
                <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">
                        {isEditingOwnComment ? "Kommentar bearbeiten" : "Dein Kommentar"}
                      </h3>
                      <p className="mt-2 text-sm text-[#9EB0C3]">
                        {user
                          ? "Teile Geschmack, Konsistenz oder Preis-Leistung. Der grüne Button speichert deinen Kommentar."
                          : "Logge dich ein, um einen Kommentar zu schreiben und abzusenden."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={submittingComments[routeSlug] === true}
                          onClick={() => {
                            handleStartEditingOwnComment();
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-[#D9FFE6] transition-colors hover:border-[#5EE287] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden="true">✏</span>
                          <span>Bearbeiten</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingComments[routeSlug] === true}
                          onClick={async () => {
                            await handleDeleteOwnComment();
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-[#5A2A2A] bg-[#2A1111] px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden="true">🗑</span>
                          <span>{submittingComments[routeSlug] === true ? "Lösche..." : "Löschen"}</span>
                        </button>
                      </div>
                    </div>

                    <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1 text-xs font-semibold text-[#D6E2EF]">
                      {isEditingOwnComment ? "Bearbeiten" : "Optionaler Kommentar"}
                    </span>
                  </div>

                  <textarea
                    className="mt-4 min-h-32 w-full rounded-xl border border-[#2D3A4B] bg-[#141C27] p-3 text-white placeholder:text-[#8CA1B8]"
                    placeholder="Was hat dir gefallen oder nicht gefallen?"
                    value={commentDraft}
                    maxLength={MAX_COMMENT_LENGTH}
                    onChange={(e) => {
                      if (!user) return;
                      updateCommentDraft(routeSlug, e.target.value);
                      setCommentMessage(null);
                    }}
                    disabled={!user}
                  />

                  <p className="mt-2 text-xs text-[#8CA1B8]">
                    Beschreibe kurz, was du probiert hast (min. 10 Zeichen).
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#8CA1B8]">
                      {commentDraft.length}/{MAX_COMMENT_LENGTH} Zeichen
                    </p>

                    <div className="flex items-center gap-2">
                      {isEditingOwnComment && hasSavedComment && (
                        <button
                          type="button"
                          className="px-4 py-2 rounded-lg border border-[#2D3A4B] bg-[#141C27] text-white font-semibold hover:border-[#5EE287] disabled:opacity-60 disabled:cursor-not-allowed"
                          disabled={submittingComments[routeSlug] === true}
                          onClick={() => {
                            updateCommentDraft(routeSlug, savedComment);
                            setIsEditingOwnComment(false);
                            setCommentMessage(null);
                          }}
                        >
                          Abbrechen
                        </button>
                      )}

                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg bg-[#5EE287] text-[#0C1910] font-semibold hover:bg-[#75F39B] disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={
                          !user ||
                          submittingComments[routeSlug] === true ||
                          !isCommentLongEnough
                        }
                        onClick={async () => {
                          const response = await submitComment(routeSlug);
                          if (!response.success) {
                            setCommentMessage(response.error || "Kommentar konnte nicht gesendet werden.");
                            return;
                          }

                          setIsEditingOwnComment(false);
                          setCommentMessage("Kommentar erfolgreich gespeichert.");
                          setDetailsReloadToken((prev) => prev + 1);
                        }}
                      >
                        {submittingComments[routeSlug]
                          ? "Sende..."
                          : isEditingOwnComment
                            ? "Kommentar speichern"
                            : "Kommentar absenden"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4">
                  <div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Dein Kommentar</h3>
                      <p className="hidden">
                        Dein Kommentar ist bereits gespeichert. Über die drei Punkte am Kommentar kannst du ihn bearbeiten oder löschen.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={submittingComments[routeSlug] === true}
                          onClick={() => {
                            handleStartEditingOwnComment();
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-[#D9FFE6] transition-colors hover:border-[#5EE287] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden="true">✏</span>
                          <span>Bearbeiten</span>
                        </button>

                        <button
                          type="button"
                          disabled={submittingComments[routeSlug] === true}
                          onClick={async () => {
                            await handleDeleteOwnComment();
                          }}
                          className="inline-flex items-center gap-2 rounded-full border border-[#5A2A2A] bg-[#2A1111] px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:border-red-300 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden="true">🗑</span>
                          <span>{submittingComments[routeSlug] === true ? "Lösche..." : "Löschen"}</span>
                        </button>
                      </div>
                    </div>
                    <span className="hidden">
                      Bereits veröffentlicht
                    </span>
                  </div>
                </div>
              )}

              {commentErrors[routeSlug] && (
                <p className="text-xs text-red-300 mt-2">{commentErrors[routeSlug]}</p>
              )}

              {commentMessage && !commentErrors[routeSlug] && (
                <p className="text-xs text-[#8AF5AC] mt-2">{commentMessage}</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}




