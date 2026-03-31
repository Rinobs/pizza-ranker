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
  getProductBuyLink,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
} from "@/app/data/products";
import { useUserCustomLists } from "@/app/hooks/useUserCustomLists";
import { useReviewLikes } from "@/app/hooks/useReviewLikes";
import { useUserRatings } from "@/app/hooks/useUserRatings";
import { useUserProductLists } from "@/app/hooks/useUserProductLists";

const PLACEHOLDER_TEXT = "9999";
const PLACEHOLDER_NUMBER = 9999;
const COMMENT_FALLBACK_USERNAME = "Anonym";

type ProductComment = {
  reviewUserId: string | null;
  username: string;
  text: string;
  updatedAt: string | null;
  isOwnComment: boolean;
  likeCount: number;
  viewerLiked: boolean;
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

type ProductDetailsPayload = {
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
  quelle: "online" | "placeholder";
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

export default function ProductPage() {
  const {
    ratings,
    comments,
    commentDrafts,
    submittingComments,
    commentErrors,
    saveRating,
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

  const product = useMemo(
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
  const [isEditingOwnComment, setIsEditingOwnComment] = useState(false);
  const [isOwnCommentMenuOpen, setIsOwnCommentMenuOpen] = useState(false);
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false);
  const [isNutritionOpen, setIsNutritionOpen] = useState(false);
  const [selectedPriceOptionId, setSelectedPriceOptionId] = useState<string | null>(null);
  const [selectedNutritionOptionId, setSelectedNutritionOptionId] = useState<string | null>(null);
  const ownCommentMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      if (!routeSlug || !product) {
        setDetailsLoading(false);
        return;
      }

      setDetailsLoading(true);

      try {
        const response = await fetch(`/api/product-details/${routeSlug}`, {
          cache: "no-store",
        });

        if (!response.ok) return;

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
  }, [routeSlug, product, detailsReloadToken]);

  const savedComment = (comments[routeSlug] || "").trim();
  const hasSavedComment = savedComment.length > 0;
  const showCommentEditor = !user || !hasSavedComment || isEditingOwnComment;

  useEffect(() => {
    setIsEditingOwnComment(false);
    setIsOwnCommentMenuOpen(false);
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

  if (!routeSlug) return null;

  if (!product || !mergedDetails) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-8 text-center shadow-[0_10px_28px_rgba(0,0,0,0.26)]">
          <h1 className="text-3xl font-bold mb-4">Produkt nicht gefunden</h1>
          <Link href="/" className="text-[#8AF5AC] hover:text-[#CFFFE0] underline">
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  const favoriteActive = isFavorite(routeSlug);
  const wantToTryActive = isWantToTry(routeSlug);
  const triedActive = isTried(routeSlug);

  const originalImageUrl = getProductImageUrl(product);
  const buyLink = getProductBuyLink(product);
  const cachedImageUrl = `/api/product-image/${routeSlug}`;

  const displayCategory = !isPlaceholderValue(mergedDetails.kategorie) ? mergedDetails.kategorie : product.category;
  const priceOptions = mergedDetails.preisOptionen || [];
  const activePriceOption =
    priceOptions.find((option) => option.id === selectedPriceOptionId) || priceOptions[0] || null;
  const nutritionOptions = mergedDetails.naehrwertOptionen || [];
  const activeNutritionOption =
    nutritionOptions.find((option) => option.id === selectedNutritionOptionId) ||
    nutritionOptions[0] ||
    null;
  const activeNutritionValues = activeNutritionOption?.values || mergedDetails.naehrwerte;

  const keyFacts: Array<[string, string | number]> = [
    ["Kategorie", displayCategory || product.category],
    ["Marke", mergedDetails.marke],
    ["Gewicht", mergedDetails.gewicht],
    ["Preis", activePriceOption?.value || mergedDetails.preis],
    ["Durchschnittsbewertung", mergedDetails.durchschnittsbewertung],
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
    setCustomListMessage(
      `Liste "${createResponse.data.name}" erstellt und Produkt hinzugefügt.`
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#E8F6ED]">
            {product.name}
          </h1>
          {buyLink ? (
            <BuyButton
              href={buyLink.url}
              sourceLabel={buyLink.sourceLabel}
              productName={product.name}
            />
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="group lg:sticky lg:top-28 lg:self-start">
            <div className="flex min-h-[320px] items-center justify-center px-2 py-2 sm:min-h-[440px] sm:px-4 lg:min-h-[calc(100vh-9rem)] lg:py-6">
              <img
                src={cachedImageUrl}
                className="h-[260px] w-auto max-w-full object-contain drop-shadow-[0_20px_42px_rgba(0,0,0,0.38)] transition-transform duration-500 group-hover:scale-[1.04] sm:h-[360px] lg:h-auto lg:max-h-[72vh]"
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

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Kommentare</h2>

              {mergedDetails.kommentare.length > 0 ? (
                <ul className="space-y-3">
                  {mergedDetails.kommentare.map((comment, index) => (
                    <li
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
                            <div className="mt-4">
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
                                    updateCommentDraft(routeSlug, savedComment);
                                    setIsEditingOwnComment(true);
                                    setIsOwnCommentMenuOpen(false);
                                    setCommentMessage(null);
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

              <div className="mb-5 rounded-[24px] border border-[#2A394B] bg-[#111925]/88 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Eigene Listen</h3>
                    <p className="mt-2 text-sm text-[#9EB0C3]">
                      Sortiere dieses Produkt in deine eigenen, benannten Listen ein oder lege direkt eine neue an.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
                    <input
                      type="text"
                      value={customListInput}
                      maxLength={40}
                      onChange={(event) => {
                        setCustomListInput(event.target.value);
                        setCustomListMessage(null);
                      }}
                      placeholder="Neue Liste anlegen"
                      disabled={!user || creatingList}
                      className="min-h-11 w-full min-w-[220px] rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={!user || creatingList}
                      onClick={() => {
                        void handleCreateCustomList();
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingList ? "Erstelle..." : "Liste + Produkt"}
                    </button>
                  </div>
                </div>

                {(customListsError || customListMessage) && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${customListsError ? "border-[#6A3434] bg-[#2A1313] text-red-100" : "border-[#2D5B41] bg-[#173023] text-[#D9FFE6]"}`}>
                    {customListsError || customListMessage}
                  </div>
                )}

                {!customListsLoaded ? (
                  <p className="mt-4 text-sm text-[#8CA1B8]">Eigene Listen werden geladen...</p>
                ) : customLists.length === 0 ? (
                  <p className="mt-4 rounded-[20px] border border-dashed border-[#35503D] bg-[#0F1722] px-4 py-3 text-sm text-[#AFC1D3]">
                    Du hast noch keine eigenen Listen. Lege oben deine erste Liste an und packe das Produkt direkt hinein.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {customLists.map((list) => {
                      const active = isProductInCustomList(list.id, routeSlug);

                      return (
                        <button
                          key={list.id}
                          type="button"
                          disabled={!user || isUpdatingItem(list.id, routeSlug)}
                          onClick={async () => {
                            const response = await setProductInCustomList(
                              list.id,
                              routeSlug,
                              !active
                            );

                            if (!response.success) {
                              return;
                            }

                            setCustomListMessage(
                              active
                                ? `Aus "${list.name}" entfernt.`
                                : `Zu "${list.name}" hinzugefügt.`
                            );
                          }}
                          className={`rounded-[20px] border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            active
                              ? "border-[#5EE287] bg-[linear-gradient(135deg,rgba(94,226,135,0.15),rgba(20,28,39,0.96))]"
                              : "border-[#2D3A4B] bg-[#101822] hover:border-[#5EE287]/35"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{list.name}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8CA1B8]">
                                {list.itemCount} Produkte
                              </p>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? "bg-[#5EE287] text-[#0C1910]" : "border border-[#2D3A4B] bg-[#141C27] text-[#D6E2EF]"}`}>
                              {active ? "In Liste" : "Hinzufügen"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    rating={ratings[routeSlug] || 0}
                    index={i}
                    onRate={(value) => {
                      if (!user) return alert("Bitte einloggen!");
                      setCommentMessage(null);
                      void saveRating(routeSlug, value);
                    }}
                  />
                ))}
              </div>

              {showCommentEditor ? (
                <>
                  <textarea
                    className="w-full bg-[#141C27] border border-[#2D3A4B] rounded-xl p-3 text-white placeholder:text-[#8CA1B8] min-h-32"
                    placeholder="Kommentar"
                    value={commentDrafts[routeSlug] || ""}
                    maxLength={1000}
                    onChange={(e) => {
                      if (!user) return;
                      updateCommentDraft(routeSlug, e.target.value);
                      setCommentMessage(null);
                    }}
                    disabled={!user}
                  />

                  <div className="flex items-center justify-between mt-3 gap-3">
                    <p className="text-xs text-[#8CA1B8]">
                      {(commentDrafts[routeSlug] || "").length}/1000 Zeichen
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
                        disabled={!user || submittingComments[routeSlug] === true}
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
                </>
              ) : null}

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




