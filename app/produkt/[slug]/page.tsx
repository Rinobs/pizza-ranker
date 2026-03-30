"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Star from "@/app/components/Star";
import BackButton from "@/app/components/BackButton";
import {
  ALL_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
} from "@/app/data/products";
import { useUserRatings } from "@/app/hooks/useUserRatings";
import { useUserProductLists } from "@/app/hooks/useUserProductLists";

const PLACEHOLDER_TEXT = "9999";
const PLACEHOLDER_NUMBER = 9999;
const COMMENT_FALLBACK_USERNAME = "Anonym";

type ProductComment = {
  username: string;
  text: string;
  updatedAt: string | null;
  isOwnComment: boolean;
};

type AminoAcidEntry = {
  name: string;
  amount: string;
};

type ProductDetailsPayload = {
  marke: string;
  gewicht: string;
  preis: string;
  kategorie?: string | null;
  zutaten: string;
  naehrwerte: {
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
  aminosaeurenprofil?: AminoAcidEntry[];
  durchschnittsbewertung: number | string;
  kommentare: ProductComment[];
  quelle: "online" | "placeholder";
};

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
          username: COMMENT_FALLBACK_USERNAME,
          text,
          updatedAt: null,
          isOwnComment: false,
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
        username,
        text,
        updatedAt: typeof comment.updatedAt === "string" ? comment.updatedAt : null,
        isOwnComment: comment.isOwnComment === true,
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
    deleteRating,
    deleteComment,
    updateCommentDraft,
    submitComment,
    user,
  } = useUserRatings();

  const {
    isFavorite,
    isWantToTry,
    toggleFavorite,
    toggleWantToTry,
    isUpdating,
    error: listError,
    listTypes,
  } = useUserProductLists();

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
  const [isEditingOwnComment, setIsEditingOwnComment] = useState(false);

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
  }, [routeSlug]);

  useEffect(() => {
    if (!hasSavedComment) {
      setIsEditingOwnComment(false);
    }
  }, [hasSavedComment]);

  if (!routeSlug) return null;

  if (!product) {
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

  const originalImageUrl = getProductImageUrl(product);
  const cachedImageUrl = `/api/product-image/${routeSlug}`;
  const fallback = createFallbackDetails(product);
  const mergedDetails = mergeDetails(fallback, details);
  const hasOwnRating = (ratings[routeSlug] || 0) > 0;

  const displayCategory = !isPlaceholderValue(mergedDetails.kategorie) ? mergedDetails.kategorie : product.category;

  const keyFacts: Array<[string, string | number]> = [
    ["Kategorie", displayCategory || product.category],
    ["Marke", mergedDetails.marke],
    ["Gewicht", mergedDetails.gewicht],
    ["Preis", mergedDetails.preis],
    ["Durchschnittsbewertung", mergedDetails.durchschnittsbewertung],
  ];

  const nutritionFacts: Array<[string, string | number]> = [
    ["Kalorien", mergedDetails.naehrwerte.kcal],
    ["Protein", mergedDetails.naehrwerte.protein],
    ["Fett", mergedDetails.naehrwerte.fat],
    ["Kohlenhydrate", mergedDetails.naehrwerte.carbs],
  ];

  if (!isPlaceholderValue(mergedDetails.naehrwerte.energyKj)) {
    nutritionFacts.unshift(["Energie", mergedDetails.naehrwerte.energyKj as string | number]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.saturatedFat)) {
    nutritionFacts.push([
      "davon gesättigte Fettsäuren",
      mergedDetails.naehrwerte.saturatedFat as string | number,
    ]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.sugar)) {
    nutritionFacts.push(["davon Zucker", mergedDetails.naehrwerte.sugar as string | number]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.ballaststoffe)) {
    nutritionFacts.push(["Ballaststoffe", mergedDetails.naehrwerte.ballaststoffe as string | number]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.salz)) {
    nutritionFacts.push(["Salz", mergedDetails.naehrwerte.salz as string | number]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.polyole)) {
    nutritionFacts.push(["Mehrwertige Alkohole", mergedDetails.naehrwerte.polyole as string | number]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.koffein)) {
    nutritionFacts.push(["Koffein", mergedDetails.naehrwerte.koffein as string | number]);
  }

  if (!isPlaceholderValue(mergedDetails.naehrwerte.glucomannan)) {
    nutritionFacts.push(["Glucomannan", mergedDetails.naehrwerte.glucomannan as string | number]);
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-7 text-[#E8F6ED]">
          {product.name}
        </h1>

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
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Produktdetails</h2>
              <ul className="grid sm:grid-cols-2 gap-2 text-[#C4D0DE]">
                {keyFacts.map(([key, value]) => (
                  <li key={key} className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                    <strong className="text-white">{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Zutaten</h2>
              <p className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-3 text-[#C4D0DE] text-sm leading-relaxed">
                {mergedDetails.zutaten}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Nährwerte</h2>
              <ul className="grid sm:grid-cols-2 gap-2 text-[#C4D0DE]">
                {nutritionFacts.map(([label, value]) => (
                  <li key={label} className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                    <strong className="text-white">{label}:</strong> {value}
                  </li>
                ))}
              </ul>
              {detailsLoading && <p className="text-xs text-[#8CA1B8] mt-2">Lade Produktdaten...</p>}
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
                              comment.isOwnComment ? "text-[#F3FFF6]" : "text-[#C4D0DE]"
                            }`}
                          >
                            {comment.text}
                          </p>
                        </div>

                        {comment.isOwnComment && user && (
                          <div className="flex shrink-0 items-center gap-2 opacity-100 transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:opacity-100">
                            <button
                              type="button"
                              className="rounded-lg border border-[#5EE287]/35 bg-[#102116]/80 px-3 py-1.5 text-xs font-semibold text-[#CFFFE0] transition-colors hover:bg-[#16301F] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={submittingComments[routeSlug] === true}
                              onClick={() => {
                                updateCommentDraft(routeSlug, savedComment);
                                setIsEditingOwnComment(true);
                                setCommentMessage(null);
                              }}
                            >
                              Bearbeiten
                            </button>

                            <button
                              type="button"
                              className="rounded-lg border border-red-400/30 bg-[#2A1111]/80 px-3 py-1.5 text-xs font-semibold text-red-200 transition-colors hover:bg-[#3A1717] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={submittingComments[routeSlug] === true}
                              onClick={async () => {
                                const response = await deleteComment(routeSlug);
                                if (!response.success) {
                                  setCommentMessage(response.error || "Kommentar konnte nicht gelöscht werden.");
                                  return;
                                }

                                setIsEditingOwnComment(false);
                                setCommentMessage("Kommentar erfolgreich gelöscht.");
                                setDetailsReloadToken((prev) => prev + 1);
                              }}
                            >
                              {submittingComments[routeSlug] ? "Lösche..." : "Löschen"}
                            </button>
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
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Bewerten</h2>

              {!user && (
                <p className="text-sm text-[#8CA1B8] mb-3">
                  Bitte logge dich ein, um zu bewerten, Favoriten zu setzen und Produkte zu merken.
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
              </div>

              {listError && <p className="text-xs text-red-300 mb-3">{listError}</p>}
              {listMessage && !listError && (
                <p className="text-xs text-[#8AF5AC] mb-3">{listMessage}</p>
              )}

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
              ) : (
                <p className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2 text-sm text-[#8CA1B8]">
                  Dein Kommentar ist gespeichert. Bearbeiten oder löschen kannst du ihn direkt an
                  deinem Kommentar.
                </p>
              )}

              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-[#2A1111] border border-[#5A2A2A] text-red-200 font-semibold hover:bg-[#3A1717] disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={!user || submittingComments[routeSlug] === true || !hasOwnRating}
                  onClick={async () => {
                    const response = await deleteRating(routeSlug);
                    if (!response.success) {
                      setCommentMessage(response.error || "Bewertung konnte nicht gelöscht werden.");
                      return;
                    }

                    setCommentMessage("Bewertung erfolgreich gelöscht.");
                    setDetailsReloadToken((prev) => prev + 1);
                  }}
                >
                  Bewertung löschen
                </button>
              </div>

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




