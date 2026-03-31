"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const LIST_TYPES = {
  FAVORITES: "favorites",
  WANT_TO_TRY: "want_to_try",
  TRIED: "tried",
} as const;

type ListType = (typeof LIST_TYPES)[keyof typeof LIST_TYPES];

type ListRow = {
  product_slug: string;
  list_type: ListType;
  inserted_at: string | null;
};

type ListsResponse = {
  success: boolean;
  data?: ListRow[];
  error?: string;
};

type UpdateResponse = {
  success: boolean;
  data?: {
    productSlug: string;
    listType: ListType;
    active: boolean;
  };
  error?: string;
};

function setWithValue(
  prev: Record<string, true>,
  slug: string,
  active: boolean
): Record<string, true> {
  if (active) {
    return {
      ...prev,
      [slug]: true,
    };
  }

  if (!prev[slug]) {
    return prev;
  }

  const next = { ...prev };
  delete next[slug];
  return next;
}

export function useUserProductLists() {
  const { data: session } = useSession();
  const user = session?.user;

  const [favorites, setFavorites] = useState<Record<string, true>>({});
  const [wantToTry, setWantToTry] = useState<Record<string, true>>({});
  const [tried, setTried] = useState<Record<string, true>>({});
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setFavorites({});
      setWantToTry({});
      setTried({});
      setLoaded(true);
      setUpdating({});
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoaded(false);
    setError(null);

    async function loadLists() {
      try {
        const response = await fetch("/api/product-lists", {
          cache: "no-store",
        });

        const json = (await response.json()) as ListsResponse;

        if (!response.ok || !json.success || cancelled) {
          if (!cancelled) {
            setError(json.error || "Listen konnten nicht geladen werden.");
          }
          return;
        }

        const favoriteMap: Record<string, true> = {};
        const wantToTryMap: Record<string, true> = {};
        const triedMap: Record<string, true> = {};

        for (const row of json.data ?? []) {
          if (row.list_type === LIST_TYPES.FAVORITES) {
            favoriteMap[row.product_slug] = true;
          }

          if (row.list_type === LIST_TYPES.WANT_TO_TRY) {
            wantToTryMap[row.product_slug] = true;
          }

          if (row.list_type === LIST_TYPES.TRIED) {
            triedMap[row.product_slug] = true;
          }
        }

        setFavorites(favoriteMap);
        setWantToTry(wantToTryMap);
        setTried(triedMap);
      } catch {
        if (!cancelled) {
          setError("Listen konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    void loadLists();

    return () => {
      cancelled = true;
    };
  }, [user]);

  function getUpdatingKey(listType: ListType, productSlug: string) {
    return `${listType}:${productSlug}`;
  }

  function isFavorite(productSlug: string) {
    return favorites[productSlug] === true;
  }

  function isWantToTry(productSlug: string) {
    return wantToTry[productSlug] === true;
  }

  function isTried(productSlug: string) {
    return tried[productSlug] === true;
  }

  function isUpdating(listType: ListType, productSlug: string) {
    return updating[getUpdatingKey(listType, productSlug)] === true;
  }

  async function setProductInList(
    productSlug: string,
    listType: ListType,
    active: boolean
  ) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } as UpdateResponse;
    }

    const key = getUpdatingKey(listType, productSlug);
    setUpdating((prev) => ({ ...prev, [key]: true }));
    setError(null);

    const previousFavorites = favorites;
    const previousWantToTry = wantToTry;
    const previousTried = tried;

    if (listType === LIST_TYPES.FAVORITES) {
      setFavorites((prev) => setWithValue(prev, productSlug, active));
    } else if (listType === LIST_TYPES.WANT_TO_TRY) {
      setWantToTry((prev) => setWithValue(prev, productSlug, active));
    } else {
      setTried((prev) => setWithValue(prev, productSlug, active));

      if (active) {
        setWantToTry((prev) => setWithValue(prev, productSlug, false));
      }
    }

    try {
      const response = await fetch("/api/product-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productSlug,
          listType,
          active,
        }),
      });

      const json = (await response.json()) as UpdateResponse;

      if (!response.ok || !json.success) {
        setFavorites(previousFavorites);
        setWantToTry(previousWantToTry);
        setTried(previousTried);

        const message = json.error || "Liste konnte nicht gespeichert werden.";
        setError(message);

        return {
          success: false,
          error: message,
        } as UpdateResponse;
      }

      return json;
    } catch {
      setFavorites(previousFavorites);
      setWantToTry(previousWantToTry);
      setTried(previousTried);

      const message = "Liste konnte nicht gespeichert werden.";
      setError(message);

      return {
        success: false,
        error: message,
      } as UpdateResponse;
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function toggleFavorite(productSlug: string) {
    const active = !isFavorite(productSlug);
    return setProductInList(productSlug, LIST_TYPES.FAVORITES, active);
  }

  async function toggleWantToTry(productSlug: string) {
    const active = !isWantToTry(productSlug);
    return setProductInList(productSlug, LIST_TYPES.WANT_TO_TRY, active);
  }

  async function toggleTried(productSlug: string) {
    const active = !isTried(productSlug);
    return setProductInList(productSlug, LIST_TYPES.TRIED, active);
  }

  return {
    user,
    loaded,
    error,
    isFavorite,
    isWantToTry,
    isTried,
    toggleFavorite,
    toggleWantToTry,
    toggleTried,
    isUpdating,
    favoriteSlugs: Object.keys(favorites),
    wantToTrySlugs: Object.keys(wantToTry),
    triedSlugs: Object.keys(tried),
    listTypes: LIST_TYPES,
  };
}
