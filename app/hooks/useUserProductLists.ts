"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const LIST_TYPES = {
  FAVORITES: "favorites",
  WANT_TO_TRY: "want_to_try",
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
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setFavorites({});
      setWantToTry({});
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

        for (const row of json.data ?? []) {
          if (row.list_type === LIST_TYPES.FAVORITES) {
            favoriteMap[row.product_slug] = true;
          }

          if (row.list_type === LIST_TYPES.WANT_TO_TRY) {
            wantToTryMap[row.product_slug] = true;
          }
        }

        setFavorites(favoriteMap);
        setWantToTry(wantToTryMap);
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

    if (listType === LIST_TYPES.FAVORITES) {
      setFavorites((prev) => setWithValue(prev, productSlug, active));
    } else {
      setWantToTry((prev) => setWithValue(prev, productSlug, active));
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

  return {
    user,
    loaded,
    error,
    isFavorite,
    isWantToTry,
    toggleFavorite,
    toggleWantToTry,
    isUpdating,
    favoriteSlugs: Object.keys(favorites),
    wantToTrySlugs: Object.keys(wantToTry),
    listTypes: LIST_TYPES,
  };
}
