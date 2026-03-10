"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackButton from "@/app/components/BackButton";
import { ALL_PRODUCTS, getProductRouteSlug } from "@/app/data/products";
import { useUserRatings } from "@/app/hooks/useUserRatings";
import { useUserProductLists } from "@/app/hooks/useUserProductLists";

type RatedProduct = {
  slug: string;
  name: string;
  category: string;
  rating: number;
  comment: string;
};

type ListProduct = {
  slug: string;
  name: string;
  category: string;
};

export default function ProfilPage() {
  const {
    user,
    ratings,
    comments,
    loaded: ratingsLoaded,
    username,
    saveUsername,
    profileLoaded,
    savingUsername,
    profileError,
    usernameLimits,
  } = useUserRatings();

  const {
    favoriteSlugs,
    wantToTrySlugs,
    loaded: listsLoaded,
  } = useUserProductLists();

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profileLoaded) return;
    setUsernameInput(username);
  }, [profileLoaded, username]);

  const productBySlug = useMemo(() => {
    const map = new Map<string, (typeof ALL_PRODUCTS)[number]>();

    for (const product of ALL_PRODUCTS) {
      map.set(getProductRouteSlug(product), product);
    }

    return map;
  }, []);

  const ratedProducts = useMemo(() => {
    const slugs = new Set<string>([...Object.keys(ratings), ...Object.keys(comments)]);

    const result: RatedProduct[] = [];

    for (const slug of slugs) {
      const rating = typeof ratings[slug] === "number" ? ratings[slug] : 0;
      const comment = typeof comments[slug] === "string" ? comments[slug].trim() : "";

      if (rating <= 0 && comment.length === 0) continue;

      const product = productBySlug.get(slug);

      result.push({
        slug,
        name: product?.name ?? slug,
        category: product?.category ?? "Unbekannt",
        rating,
        comment,
      });
    }

    result.sort((a, b) => {
      if (a.rating !== b.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [comments, productBySlug, ratings]);

  const favoriteProducts = useMemo(() => {
    const result: ListProduct[] = favoriteSlugs.map((slug) => {
      const product = productBySlug.get(slug);

      return {
        slug,
        name: product?.name ?? slug,
        category: product?.category ?? "Unbekannt",
      };
    });

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [favoriteSlugs, productBySlug]);

  const wantToTryProducts = useMemo(() => {
    const result: ListProduct[] = wantToTrySlugs.map((slug) => {
      const product = productBySlug.get(slug);

      return {
        slug,
        name: product?.name ?? slug,
        category: product?.category ?? "Unbekannt",
      };
    });

    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [productBySlug, wantToTrySlugs]);

  if (!profileLoaded) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 text-[#C4D0DE]">
          Profil wird geladen...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#E8F6ED] mb-3">Mein Profil</h1>
          <p className="text-[#C4D0DE] mb-5">
            Bitte logge dich ein, damit du deinen Username, Favoriten und deine Bewertungen sehen kannst.
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-[#5EE287] px-4 py-2 font-semibold text-[#0C1910] hover:bg-[#75F39B]"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#E8F6ED] mb-7">
          Mein Profil
        </h1>

        <section className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 sm:p-5 mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-3">Username</h2>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={usernameInput}
              maxLength={usernameLimits.max}
              onChange={(event) => {
                setUsernameInput(event.target.value);
                setUsernameMessage(null);
              }}
              placeholder="Username eingeben"
              className="w-full bg-[#0F1621] border border-[#2D3A4B] rounded-lg px-3 py-2 text-white placeholder:text-[#8CA1B8]"
            />
            <button
              type="button"
              disabled={savingUsername}
              onClick={async () => {
                const response = await saveUsername(usernameInput);

                if (response.success) {
                  setUsernameMessage("Username gespeichert.");
                } else {
                  setUsernameMessage(null);
                }
              }}
              className="px-4 py-2 rounded-lg bg-[#5EE287] text-[#0C1910] font-semibold hover:bg-[#75F39B] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingUsername ? "Speichere..." : "Speichern"}
            </button>
          </div>

          <p className="text-xs text-[#8CA1B8] mt-2">
            Der Username wird bei deinen Kommentaren angezeigt ({usernameLimits.min}-{usernameLimits.max} Zeichen).
          </p>

          {profileError && <p className="text-xs text-red-300 mt-2">{profileError}</p>}
          {usernameMessage && <p className="text-xs text-[#8AF5AC] mt-2">{usernameMessage}</p>}
        </section>

        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">Meine Favoriten</h2>

          {!listsLoaded && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Favoriten werden geladen...
            </div>
          )}

          {listsLoaded && favoriteProducts.length === 0 && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Du hast noch keine Favoriten hinzugefuegt.
            </div>
          )}

          {listsLoaded && favoriteProducts.length > 0 && (
            <ul className="grid gap-3 sm:gap-4">
              {favoriteProducts.map((item) => (
                <li key={`favorite-${item.slug}`} className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4">
                  <Link
                    href={`/produkt/${item.slug}`}
                    className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[#8CA1B8] mt-1">{item.category}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">
            Produkte die ich probieren moechte
          </h2>

          {!listsLoaded && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Probieren-Liste wird geladen...
            </div>
          )}

          {listsLoaded && wantToTryProducts.length === 0 && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Deine Probieren-Liste ist noch leer.
            </div>
          )}

          {listsLoaded && wantToTryProducts.length > 0 && (
            <ul className="grid gap-3 sm:gap-4">
              {wantToTryProducts.map((item) => (
                <li key={`want-to-try-${item.slug}`} className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4">
                  <Link
                    href={`/produkt/${item.slug}`}
                    className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[#8CA1B8] mt-1">{item.category}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">
            Bereits bewertete Produkte
          </h2>

          {!ratingsLoaded && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Bewertungen werden geladen...
            </div>
          )}

          {ratingsLoaded && ratedProducts.length === 0 && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Du hast noch keine Produkte bewertet.
            </div>
          )}

          {ratingsLoaded && ratedProducts.length > 0 && (
            <ul className="grid gap-3 sm:gap-4">
              {ratedProducts.map((item) => (
                <li key={item.slug} className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/produkt/${item.slug}`}
                        className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xs text-[#8CA1B8] mt-1">{item.category}</p>
                    </div>

                    <span className="shrink-0 rounded-lg bg-[#1E2A3A] border border-[#2D3A4B] px-2.5 py-1 text-sm text-yellow-300">
                      {item.rating > 0 ? `Rating ${item.rating.toFixed(1)}/5` : "Keine Sterne"}
                    </span>
                  </div>

                  <p className="text-sm text-[#C4D0DE] mt-3">
                    {item.comment || "Kein Kommentar hinterlegt."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
