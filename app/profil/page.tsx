"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

type RatedSortMode =
  | "rating-desc"
  | "rating-asc"
  | "category-asc"
  | "category-desc"
  | "name-asc"
  | "name-desc";

type FollowProfile = {
  userId: string;
  username: string;
  isFollowing: boolean;
  followedAt: string | null;
};

type ProfileSearchResult = {
  userId: string;
  username: string;
  isFollowing: boolean;
};

type FollowListResponse = {
  success: boolean;
  data?: FollowProfile[];
  error?: string;
};

type ProfileSearchResponse = {
  success: boolean;
  data?: ProfileSearchResult[];
  error?: string;
};

type ToggleFollowResponse = {
  success: boolean;
  data?: {
    targetUserId: string;
    active: boolean;
  };
  error?: string;
};

export default function ProfilPage() {
  const {
    user,
    ratings,
    comments,
    loaded: ratingsLoaded,
    username,
    hasUsername,
    saveUsername,
    profileLoaded,
    savingUsername,
    profileError,
    usernameLimits,
  } = useUserRatings();

  const { favoriteSlugs, wantToTrySlugs, loaded: listsLoaded } = useUserProductLists();

  const [usernameInput, setUsernameInput] = useState("");
  const [usernameMessage, setUsernameMessage] = useState<string | null>(null);
  const [selectedRatedCategory, setSelectedRatedCategory] = useState("all");
  const [ratedSortMode, setRatedSortMode] = useState<RatedSortMode>("rating-desc");

  const [profileSearchQuery, setProfileSearchQuery] = useState("");
  const [profileSearchResults, setProfileSearchResults] = useState<ProfileSearchResult[]>([]);
  const [searchingProfiles, setSearchingProfiles] = useState(false);
  const [profileSearchError, setProfileSearchError] = useState<string | null>(null);
  const [profileSearchPerformed, setProfileSearchPerformed] = useState(false);

  const [followingProfiles, setFollowingProfiles] = useState<FollowProfile[]>([]);
  const [followerProfiles, setFollowerProfiles] = useState<FollowProfile[]>([]);
  const [followsLoaded, setFollowsLoaded] = useState(false);
  const [openFollowList, setOpenFollowList] = useState<"following" | "followers" | null>(null);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const [followMutationUserId, setFollowMutationUserId] = useState<string | null>(null);

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
      return a.name.localeCompare(b.name, "de");
    });

    return result;
  }, [comments, productBySlug, ratings]);

  const ratedCategories = useMemo(() => {
    const categories = Array.from(new Set(ratedProducts.map((product) => product.category)));
    categories.sort((a, b) => a.localeCompare(b, "de"));
    return categories;
  }, [ratedProducts]);

  const visibleRatedProducts = useMemo(() => {
    const filtered =
      selectedRatedCategory === "all"
        ? [...ratedProducts]
        : ratedProducts.filter((product) => product.category === selectedRatedCategory);

    filtered.sort((a, b) => {
      if (ratedSortMode === "rating-desc") {
        if (a.rating !== b.rating) return b.rating - a.rating;
        return a.name.localeCompare(b.name, "de");
      }

      if (ratedSortMode === "rating-asc") {
        if (a.rating !== b.rating) return a.rating - b.rating;
        return a.name.localeCompare(b.name, "de");
      }

      if (ratedSortMode === "category-asc") {
        const byCategory = a.category.localeCompare(b.category, "de");
        if (byCategory !== 0) return byCategory;
        return a.name.localeCompare(b.name, "de");
      }

      if (ratedSortMode === "category-desc") {
        const byCategory = b.category.localeCompare(a.category, "de");
        if (byCategory !== 0) return byCategory;
        return a.name.localeCompare(b.name, "de");
      }

      if (ratedSortMode === "name-asc") {
        return a.name.localeCompare(b.name, "de");
      }

      return b.name.localeCompare(a.name, "de");
    });

    return filtered;
  }, [ratedProducts, ratedSortMode, selectedRatedCategory]);

  const ratedProductsLabel = ratedProducts.length === 1 ? "Produkt" : "Produkte";
  const followingCount = followingProfiles.length;
  const followersCount = followerProfiles.length;

  const favoriteProducts = useMemo(() => {
    const result: ListProduct[] = favoriteSlugs.map((slug) => {
      const product = productBySlug.get(slug);

      return {
        slug,
        name: product?.name ?? slug,
        category: product?.category ?? "Unbekannt",
      };
    });

    result.sort((a, b) => a.name.localeCompare(b.name, "de"));
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

    result.sort((a, b) => a.name.localeCompare(b.name, "de"));
    return result;
  }, [productBySlug, wantToTrySlugs]);

  const loadFollowProfiles = useCallback(async () => {
    if (!user) {
      setFollowingProfiles([]);
      setFollowerProfiles([]);
      setOpenFollowList(null);
      setFollowsLoaded(true);
      return;
    }

    setFollowsLoaded(false);

    try {
      const [followingResponse, followersResponse] = await Promise.all([
        fetch("/api/follows?type=following", {
          cache: "no-store",
        }),
        fetch("/api/follows?type=followers", {
          cache: "no-store",
        }),
      ]);

      const [followingJson, followersJson] = (await Promise.all([
        followingResponse.json(),
        followersResponse.json(),
      ])) as [FollowListResponse, FollowListResponse];

      if (!followingResponse.ok || !followingJson.success) {
        setFollowingProfiles([]);
      } else {
        setFollowingProfiles(Array.isArray(followingJson.data) ? followingJson.data : []);
      }

      if (!followersResponse.ok || !followersJson.success) {
        setFollowerProfiles([]);
      } else {
        setFollowerProfiles(Array.isArray(followersJson.data) ? followersJson.data : []);
      }
    } catch {
      setFollowingProfiles([]);
      setFollowerProfiles([]);
    } finally {
      setFollowsLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    void loadFollowProfiles();
  }, [loadFollowProfiles]);

  async function handleSearchProfiles() {
    const query = profileSearchQuery.trim();
    setProfileSearchPerformed(true);
    setProfileSearchError(null);
    setFollowMessage(null);

    if (query.length < 2) {
      setProfileSearchResults([]);
      setProfileSearchError("Bitte gib mindestens 2 Zeichen ein.");
      return;
    }

    setSearchingProfiles(true);

    try {
      const response = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });

      const json = (await response.json()) as ProfileSearchResponse;

      if (!response.ok || !json.success) {
        setProfileSearchResults([]);
        setProfileSearchError(json.error || "Profile konnten nicht geladen werden.");
        return;
      }

      setProfileSearchResults(Array.isArray(json.data) ? json.data : []);
    } catch {
      setProfileSearchResults([]);
      setProfileSearchError("Profile konnten nicht geladen werden.");
    } finally {
      setSearchingProfiles(false);
    }
  }

  async function handleToggleFollow(targetUserId: string, active: boolean, usernameText: string) {
    setFollowMutationUserId(targetUserId);
    setFollowMessage(null);
    setProfileSearchError(null);

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId,
          active,
        }),
      });

      const json = (await response.json()) as ToggleFollowResponse;

      if (!response.ok || !json.success) {
        setFollowMessage(json.error || "Folgen-Status konnte nicht geändert werden.");
        return;
      }

      setProfileSearchResults((prev) =>
        prev.map((entry) =>
          entry.userId === targetUserId ? { ...entry, isFollowing: active } : entry
        )
      );

      setFollowMessage(
        active
          ? `Du folgst jetzt ${usernameText}.`
          : `Du folgst ${usernameText} nicht mehr.`
      );

      await loadFollowProfiles();
    } catch {
      setFollowMessage("Folgen-Status konnte nicht geändert werden.");
    } finally {
      setFollowMutationUserId(null);
    }
  }

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

          {hasUsername ? (
            <>
              <div className="rounded-xl border border-[#35503D] bg-[linear-gradient(135deg,rgba(94,226,135,0.12),rgba(15,22,33,0.95))] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-[#8AF5AC]">Fest vergeben</p>
                <p className="mt-2 text-xl font-semibold text-white">{username}</p>
              </div>

              <p className="text-xs text-[#8CA1B8] mt-2">
                Dein Username ist eindeutig gespeichert und kann nicht mehr geaendert werden.
              </p>
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={usernameInput}
                  maxLength={usernameLimits.max}
                  onChange={(event) => {
                    setUsernameInput(event.target.value);
                    setUsernameMessage(null);
                  }}
                  placeholder="Eindeutigen Username eingeben"
                  className="w-full bg-[#0F1621] border border-[#2D3A4B] rounded-lg px-3 py-2 text-white placeholder:text-[#8CA1B8]"
                />
                <button
                  type="button"
                  disabled={savingUsername}
                  onClick={async () => {
                    const response = await saveUsername(usernameInput);

                    if (response.success) {
                      setUsernameMessage("Username erfolgreich gespeichert.");
                    } else {
                      setUsernameMessage(null);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-[#5EE287] text-[#0C1910] font-semibold hover:bg-[#75F39B] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingUsername ? "Speichere..." : "Username festlegen"}
                </button>
              </div>

              <p className="text-xs text-[#8CA1B8] mt-2">
                Waehle einen eindeutigen Username fuer dein Profil ({usernameLimits.min}-{usernameLimits.max} Zeichen). Danach kann er nicht mehr geaendert werden.
              </p>
            </>
          )}

          {profileError && <p className="text-xs text-red-300 mt-2">{profileError}</p>}
          {usernameMessage && <p className="text-xs text-[#8AF5AC] mt-2">{usernameMessage}</p>}
        </section>

        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">
            Profile suchen und folgen
          </h2>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSearchProfiles();
            }}
            className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={profileSearchQuery}
                onChange={(event) => {
                  setProfileSearchQuery(event.target.value);
                  setProfileSearchError(null);
                }}
                placeholder="Username suchen"
                className="w-full bg-[#0F1621] border border-[#2D3A4B] rounded-lg px-3 py-2 text-white placeholder:text-[#8CA1B8]"
              />
              <button
                type="submit"
                disabled={searchingProfiles}
                className="px-4 py-2 rounded-lg bg-[#5EE287] text-[#0C1910] font-semibold hover:bg-[#75F39B] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {searchingProfiles ? "Suche..." : "Suchen"}
              </button>
            </div>

            <p className="text-xs text-[#8CA1B8] mt-2">
              Suche nach Usernames und folge Profilen, um deren Bewertungen und Listen zu sehen.
            </p>

            {profileSearchError && <p className="text-xs text-red-300 mt-2">{profileSearchError}</p>}
            {followMessage && <p className="text-xs text-[#8AF5AC] mt-2">{followMessage}</p>}
          </form>

          {searchingProfiles && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 mt-3 text-[#8CA1B8]">
              Suche läuft...
            </div>
          )}

          {!searchingProfiles && profileSearchResults.length > 0 && (
            <ul className="grid gap-3 sm:gap-4 mt-3">
              {profileSearchResults.map((entry) => (
                <li
                  key={`search-profile-${entry.userId}`}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 flex items-center justify-between gap-3"
                >
                  <Link
                    href={`/profil/${entry.userId}`}
                    className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                  >
                    {entry.username}
                  </Link>

                  <button
                    type="button"
                    disabled={followMutationUserId === entry.userId}
                    onClick={() => {
                      void handleToggleFollow(entry.userId, !entry.isFollowing, entry.username);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      entry.isFollowing
                        ? "bg-[#141C27] text-white border-[#2D3A4B] hover:border-red-300"
                        : "bg-[#5EE287] text-[#0C1910] border-[#5EE287] hover:bg-[#75F39B]"
                    }`}
                  >
                    {followMutationUserId === entry.userId
                      ? "Speichere..."
                      : entry.isFollowing
                        ? "Entfolgen"
                        : "Folgen"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!searchingProfiles &&
            profileSearchPerformed &&
            profileSearchResults.length === 0 &&
            !profileSearchError && (
              <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 mt-3 text-[#8CA1B8]">
                Keine passenden Profile gefunden.
              </div>
            )}
        </section>

        <section className="mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-[#E8F6ED] mb-4">
            Follower und gefolgte Profile
          </h2>

          <p className="text-xs text-[#8CA1B8] mb-3">
            Klicke auf eine Zahl, um die jeweilige Liste anzuzeigen.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setOpenFollowList((prev) => (prev === "following" ? null : "following"));
              }}
              className={`text-left rounded-2xl border bg-[#141C27] p-4 transition-colors ${
                openFollowList === "following"
                  ? "border-[#5EE287]"
                  : "border-[#2D3A4B] hover:border-[#5EE287]"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-[#8CA1B8]">Ich folge</p>
              <p className="text-2xl font-bold text-white mt-1">
                {followsLoaded ? followingCount : "..."}
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setOpenFollowList((prev) => (prev === "followers" ? null : "followers"));
              }}
              className={`text-left rounded-2xl border bg-[#141C27] p-4 transition-colors ${
                openFollowList === "followers"
                  ? "border-[#5EE287]"
                  : "border-[#2D3A4B] hover:border-[#5EE287]"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-[#8CA1B8]">Follower</p>
              <p className="text-2xl font-bold text-white mt-1">
                {followsLoaded ? followersCount : "..."}
              </p>
            </button>
          </div>

          {!followsLoaded && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 mt-3 text-[#8CA1B8]">
              Follower-Daten werden geladen...
            </div>
          )}

          {followsLoaded && openFollowList === "following" && (
            followingCount === 0 ? (
              <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 mt-3 text-[#8CA1B8]">
                Du folgst aktuell noch keinem Profil.
              </div>
            ) : (
              <ul className="grid gap-3 sm:gap-4 mt-3">
                {followingProfiles.map((entry) => (
                  <li
                    key={`following-${entry.userId}`}
                    className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/profil/${entry.userId}`}
                      className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                    >
                      {entry.username}
                    </Link>

                    <button
                      type="button"
                      disabled={followMutationUserId === entry.userId}
                      onClick={() => {
                        void handleToggleFollow(entry.userId, false, entry.username);
                      }}
                      className="px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-[#141C27] text-white border-[#2D3A4B] hover:border-red-300"
                    >
                      {followMutationUserId === entry.userId ? "Speichere..." : "Entfolgen"}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {followsLoaded && openFollowList === "followers" && (
            followersCount === 0 ? (
              <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 mt-3 text-[#8CA1B8]">
                Du hast aktuell noch keine Follower.
              </div>
            ) : (
              <ul className="grid gap-3 sm:gap-4 mt-3">
                {followerProfiles.map((entry) => (
                  <li
                    key={`follower-${entry.userId}`}
                    className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 flex items-center justify-between gap-3"
                  >
                    <Link
                      href={`/profil/${entry.userId}`}
                      className="text-white font-semibold hover:text-[#8AF5AC] transition-colors"
                    >
                      {entry.username}
                    </Link>

                    <button
                      type="button"
                      disabled={followMutationUserId === entry.userId}
                      onClick={() => {
                        void handleToggleFollow(entry.userId, !entry.isFollowing, entry.username);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                        entry.isFollowing
                          ? "bg-[#141C27] text-white border-[#2D3A4B] hover:border-red-300"
                          : "bg-[#5EE287] text-[#0C1910] border-[#5EE287] hover:bg-[#75F39B]"
                      }`}
                    >
                      {followMutationUserId === entry.userId
                        ? "Speichere..."
                        : entry.isFollowing
                          ? "Entfolgen"
                          : "Zurückfolgen"}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
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
              Du hast noch keine Favoriten hinzugefügt.
            </div>
          )}

          {listsLoaded && favoriteProducts.length > 0 && (
            <ul className="grid gap-3 sm:gap-4">
              {favoriteProducts.map((item) => (
                <li
                  key={`favorite-${item.slug}`}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
                >
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
            Produkte die ich probieren möchte
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
                <li
                  key={`want-to-try-${item.slug}`}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
                >
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
          <p className="text-sm text-[#8CA1B8] mb-4">
            {ratingsLoaded
              ? `Du hast bisher ${ratedProducts.length} ${ratedProductsLabel} bewertet.`
              : "Anzahl deiner Bewertungen wird geladen..."}
          </p>

          {!ratingsLoaded && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Bewertungen werden geladen...
            </div>
          )}

          {ratingsLoaded && ratedProducts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 mb-4">
              <select
                value={selectedRatedCategory}
                onChange={(event) => setSelectedRatedCategory(event.target.value)}
                className="w-full border rounded-xl px-3 py-2 bg-[#141C27] text-white border-[#2D3A4B] focus:border-[#5EE287] outline-none transition-colors"
              >
                <option value="all">Alle Produktarten</option>
                {ratedCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={ratedSortMode}
                onChange={(event) => setRatedSortMode(event.target.value as RatedSortMode)}
                className="w-full border rounded-xl px-3 py-2 bg-[#141C27] text-white border-[#2D3A4B] focus:border-[#5EE287] outline-none transition-colors"
              >
                <option value="rating-desc">Bewertung: hoch zu niedrig</option>
                <option value="rating-asc">Bewertung: niedrig zu hoch</option>
                <option value="category-asc">Produktart: A-Z</option>
                <option value="category-desc">Produktart: Z-A</option>
                <option value="name-asc">Name: A-Z</option>
                <option value="name-desc">Name: Z-A</option>
              </select>
            </div>
          )}

          {ratingsLoaded && ratedProducts.length === 0 && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Du hast noch keine Produkte bewertet.
            </div>
          )}

          {ratingsLoaded && ratedProducts.length > 0 && visibleRatedProducts.length === 0 && (
            <div className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4 text-[#8CA1B8]">
              Für diese Produktart hast du noch keine Produkte bewertet.
            </div>
          )}

          {ratingsLoaded && visibleRatedProducts.length > 0 && (
            <ul className="grid gap-3 sm:gap-4">
              {visibleRatedProducts.map((item) => (
                <li
                  key={item.slug}
                  className="rounded-2xl border border-[#2D3A4B] bg-[#141C27] p-4"
                >
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

