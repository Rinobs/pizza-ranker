"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  mapCustomListProductBase,
  sortCustomListsByRecent,
  type CustomList,
} from "@/lib/custom-lists";

type ListsResponse = {
  success: boolean;
  data?: CustomList[];
  error?: string;
};

type CreateListResponse = {
  success: boolean;
  data?: CustomList | null;
  error?: string;
};

type DeleteListResponse = {
  success: boolean;
  data?: {
    listId: string;
  };
  error?: string;
};

type UpdateItemResponse = {
  success: boolean;
  data?: {
    listId: string;
    productSlug: string;
    active: boolean;
  };
  error?: string;
};

function applyProductMembership(
  list: CustomList,
  productSlug: string,
  active: boolean,
  timestamp: string
) {
  const existingItem = list.items.find((item) => item.productSlug === productSlug);
  const remainingItems = list.items.filter((item) => item.productSlug !== productSlug);

  if (active) {
    const nextItem = existingItem
      ? {
          ...existingItem,
          updatedAt: timestamp,
          insertedAt: existingItem.insertedAt ?? timestamp,
        }
      : {
          ...mapCustomListProductBase(productSlug),
          insertedAt: timestamp,
          updatedAt: timestamp,
        };

    return {
      ...list,
      updatedAt: timestamp,
      itemCount: existingItem ? list.itemCount : list.itemCount + 1,
      items: [nextItem, ...remainingItems],
    };
  }

  return {
    ...list,
    updatedAt: timestamp,
    itemCount: existingItem ? Math.max(0, list.itemCount - 1) : list.itemCount,
    items: remainingItems,
  };
}

export function useUserCustomLists() {
  const { data: session } = useSession();
  const user = session?.user;

  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setCustomLists([]);
      setLoaded(true);
      setCreatingList(false);
      setDeletingListId(null);
      setUpdatingItems({});
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    setLoaded(false);
    setError(null);

    async function loadLists() {
      try {
        const response = await fetch("/api/custom-lists", {
          cache: "no-store",
        });
        const json = (await response.json()) as ListsResponse;

        if (cancelled) return;

        if (!response.ok || !json.success) {
          setCustomLists([]);
          setError(json.error || "Eigene Listen konnten nicht geladen werden.");
          return;
        }

        setCustomLists(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) {
          setCustomLists([]);
          setError("Eigene Listen konnten nicht geladen werden.");
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

  const membershipByProductSlug = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const list of customLists) {
      for (const item of list.items) {
        const existing = map.get(item.productSlug);
        if (existing) {
          existing.add(list.id);
          continue;
        }

        map.set(item.productSlug, new Set([list.id]));
      }
    }

    return map;
  }, [customLists]);

  function getUpdatingKey(listId: string, productSlug: string) {
    return `${listId}:${productSlug}`;
  }

  function isProductInCustomList(listId: string, productSlug: string) {
    return membershipByProductSlug.get(productSlug)?.has(listId) ?? false;
  }

  function isUpdatingItem(listId: string, productSlug: string) {
    return updatingItems[getUpdatingKey(listId, productSlug)] === true;
  }

  async function createCustomList(name: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } satisfies CreateListResponse;
    }

    setCreatingList(true);
    setError(null);

    try {
      const response = await fetch("/api/custom-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const json = (await response.json()) as CreateListResponse;

      if (!response.ok || !json.success || !json.data) {
        const message = json.error || "Liste konnte nicht erstellt werden.";
        setError(message);
        return {
          success: false,
          error: message,
        } satisfies CreateListResponse;
      }

      const createdList = json.data;

      setCustomLists((prev) =>
        sortCustomListsByRecent([
          createdList,
          ...prev.filter((entry) => entry.id !== createdList.id),
        ])
      );

      return json;
    } catch {
      const message = "Liste konnte nicht erstellt werden.";
      setError(message);
      return {
        success: false,
        error: message,
      } satisfies CreateListResponse;
    } finally {
      setCreatingList(false);
    }
  }

  async function deleteCustomList(listId: string) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } satisfies DeleteListResponse;
    }

    const previousLists = customLists;
    setDeletingListId(listId);
    setError(null);
    setCustomLists((prev) => prev.filter((entry) => entry.id !== listId));

    try {
      const response = await fetch(`/api/custom-lists/${listId}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as DeleteListResponse;

      if (!response.ok || !json.success) {
        setCustomLists(previousLists);

        const message = json.error || "Liste konnte nicht gelöscht werden.";
        setError(message);

        return {
          success: false,
          error: message,
        } satisfies DeleteListResponse;
      }

      return json;
    } catch {
      setCustomLists(previousLists);

      const message = "Liste konnte nicht gelöscht werden.";
      setError(message);

      return {
        success: false,
        error: message,
      } satisfies DeleteListResponse;
    } finally {
      setDeletingListId(null);
    }
  }

  async function setProductInCustomList(
    listId: string,
    productSlug: string,
    active: boolean
  ) {
    if (!user) {
      return {
        success: false,
        error: "Bitte zuerst einloggen.",
      } satisfies UpdateItemResponse;
    }

    const key = getUpdatingKey(listId, productSlug);
    const previousLists = customLists;
    const now = new Date().toISOString();

    setUpdatingItems((prev) => ({ ...prev, [key]: true }));
    setError(null);
    setCustomLists((prev) =>
      sortCustomListsByRecent(
        prev.map((list) =>
          list.id === listId
            ? applyProductMembership(list, productSlug, active, now)
            : list
        )
      )
    );

    try {
      const response = await fetch(`/api/custom-lists/${listId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productSlug,
          active,
        }),
      });
      const json = (await response.json()) as UpdateItemResponse;

      if (!response.ok || !json.success) {
        setCustomLists(previousLists);

        const message = json.error || "Liste konnte nicht aktualisiert werden.";
        setError(message);

        return {
          success: false,
          error: message,
        } satisfies UpdateItemResponse;
      }

      return json;
    } catch {
      setCustomLists(previousLists);

      const message = "Liste konnte nicht aktualisiert werden.";
      setError(message);

      return {
        success: false,
        error: message,
      } satisfies UpdateItemResponse;
    } finally {
      setUpdatingItems((prev) => ({ ...prev, [key]: false }));
    }
  }

  return {
    user,
    customLists,
    loaded,
    creatingList,
    deletingListId,
    error,
    createCustomList,
    deleteCustomList,
    setProductInCustomList,
    isProductInCustomList,
    isUpdatingItem,
    customListCount: customLists.length,
    customListItemCount: customLists.reduce((sum, list) => sum + list.itemCount, 0),
  };
}
