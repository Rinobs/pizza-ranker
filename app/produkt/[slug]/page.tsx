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

const PLACEHOLDER_TEXT = "9999";
const PLACEHOLDER_NUMBER = 9999;
const COMMENT_FALLBACK_USERNAME = "Anonym";

type ProductComment = {
  username: string;
  text: string;
  updatedAt: string | null;
};

type ProductDetailsPayload = {
  marke: string;
  gewicht: string;
  preis: string;
  zutaten: string;
  naehrwerte: {
    kcal: number | string;
    protein: number | string;
    fat: number | string;
    carbs: number | string;
  };
  durchschnittsbewertung: number | string;
  kommentare: ProductComment[];
  quelle: "online" | "placeholder";
};

function createFallbackDetails(product: Product): ProductDetailsPayload {
  return {
    marke: PLACEHOLDER_TEXT,
    gewicht: PLACEHOLDER_TEXT,
    preis: product.price?.trim() || PLACEHOLDER_TEXT,
    zutaten: PLACEHOLDER_TEXT,
    naehrwerte: {
      kcal: typeof product.kcal === "number" ? product.kcal : PLACEHOLDER_NUMBER,
      protein: typeof product.protein === "number" ? product.protein : PLACEHOLDER_NUMBER,
      fat: typeof product.fat === "number" ? product.fat : PLACEHOLDER_NUMBER,
      carbs: typeof product.carbs === "number" ? product.carbs : PLACEHOLDER_NUMBER,
    },
    durchschnittsbewertung: PLACEHOLDER_NUMBER,
    kommentare: [],
    quelle: "placeholder",
  };
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
    commentDrafts,
    submittingComments,
    commentErrors,
    saveRating,
    updateCommentDraft,
    submitComment,
    user,
    username,
    saveUsername,
    profileLoaded,
    savingUsername,
    profileError,
    usernameLimits,
  } = useUserRatings();

  const params = useParams<{ slug: string }>();
  const routeSlug = params?.slug || "";

  const product = useMemo(
    () => ALL_PRODUCTS.find((item) => getProductRouteSlug(item) === routeSlug) ?? null,
    [routeSlug]
  );

  const [details, setDetails] = useState<Partial<ProductDetailsPayload> | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsReloadToken, setDetailsReloadToken] = useState(0);

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoaded) {
      setUsernameInput(username);
    }
  }, [profileLoaded, username]);

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

  if (!routeSlug) return null;

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-8 text-center shadow-[0_10px_28px_rgba(0,0,0,0.26)]">
          <h1 className="text-3xl font-bold mb-4">Produkt nicht gefunden</h1>
          <Link href="/" className="text-[#8AF5AC] hover:text-[#CFFFE0] underline">
            Zurueck zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  const originalImageUrl = getProductImageUrl(product);
  const fallback = createFallbackDetails(product);
  const mergedDetails = mergeDetails(fallback, details);

  const keyFacts: Array<[string, string | number]> = [
    ["Kategorie", product.category],
    ["Marke", mergedDetails.marke],
    ["Gewicht", mergedDetails.gewicht],
    ["Preis", mergedDetails.preis],
    ["Durchschnittsbewertung", mergedDetails.durchschnittsbewertung],
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-7 text-[#E8F6ED]">
          {product.name}
        </h1>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
          <div className="group relative rounded-2xl overflow-hidden border border-[#2D3A4B] bg-[#141C27]">
            <img
              src={`/api/product-image/${routeSlug}`}
              className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-105"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
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
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Naehrwerte</h2>
              <ul className="grid sm:grid-cols-2 gap-2 text-[#C4D0DE]">
                <li className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                  <strong className="text-white">Kalorien:</strong> {mergedDetails.naehrwerte.kcal}
                </li>
                <li className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                  <strong className="text-white">Protein:</strong> {mergedDetails.naehrwerte.protein}
                </li>
                <li className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                  <strong className="text-white">Fett:</strong> {mergedDetails.naehrwerte.fat}
                </li>
                <li className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                  <strong className="text-white">Kohlenhydrate:</strong> {mergedDetails.naehrwerte.carbs}
                </li>
              </ul>
              {detailsLoading && <p className="text-xs text-[#8CA1B8] mt-2">Lade Produktdaten...</p>}
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Kommentare</h2>

              {mergedDetails.kommentare.length > 0 ? (
                <ul className="space-y-2">
                  {mergedDetails.kommentare.map((comment, index) => (
                    <li
                      key={`${comment.username}-${comment.updatedAt || index}-${comment.text}`}
                      className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2"
                    >
                      <p className="text-xs uppercase tracking-wide text-[#8CA1B8] mb-1">
                        {comment.username}
                      </p>
                      <p className="text-[#C4D0DE] text-sm">{comment.text}</p>
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
                  Bitte logge dich ein, um Username und Kommentare zu speichern.
                </p>
              )}

              {user && (
                <div className="mb-4 rounded-xl border border-[#2D3A4B] bg-[#141C27] p-3">
                  <label className="block text-xs font-semibold tracking-wide uppercase text-[#8CA1B8] mb-2">
                    Dein Username
                  </label>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      className="w-full bg-[#0F1621] border border-[#2D3A4B] rounded-lg px-3 py-2 text-white placeholder:text-[#8CA1B8]"
                      placeholder="Username eingeben"
                      value={usernameInput}
                      maxLength={usernameLimits.max}
                      onChange={(event) => {
                        setUsernameInput(event.target.value);
                        setUsernameMessage(null);
                      }}
                    />
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-[#5EE287] text-[#0C1910] font-semibold hover:bg-[#75F39B] disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={!profileLoaded || savingUsername}
                      onClick={async () => {
                        const response = await saveUsername(usernameInput);

                        if (response.success) {
                          setUsernameMessage("Username gespeichert.");
                          setDetailsReloadToken((prev) => prev + 1);
                        } else {
                          setUsernameMessage(null);
                        }
                      }}
                    >
                      {savingUsername ? "Speichere..." : "Username speichern"}
                    </button>
                  </div>

                  <p className="text-xs text-[#8CA1B8] mt-2">
                    Wird bei deinen Kommentaren angezeigt ({usernameLimits.min}-{usernameLimits.max} Zeichen).
                  </p>

                  {profileError && <p className="text-xs text-red-300 mt-2">{profileError}</p>}
                  {usernameMessage && <p className="text-xs text-[#8AF5AC] mt-2">{usernameMessage}</p>}
                </div>
              )}

              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    rating={ratings[routeSlug] || 0}
                    index={i}
                    onRate={(value) => {
                      if (!user) return alert("Bitte einloggen!");
                      void saveRating(routeSlug, value);
                    }}
                  />
                ))}
              </div>

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

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-[#8CA1B8]">
                  {(commentDrafts[routeSlug] || "").length}/1000 Zeichen
                </p>
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

                    setCommentMessage("Kommentar erfolgreich gespeichert.");
                    setDetailsReloadToken((prev) => prev + 1);
                  }}
                >
                  {submittingComments[routeSlug] ? "Sende..." : "Kommentar absenden"}
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

