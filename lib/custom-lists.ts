import {
  ALL_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
} from "@/app/data/products";

export const CUSTOM_LIST_NAME_MIN_LENGTH = 2;
export const CUSTOM_LIST_NAME_MAX_LENGTH = 40;
export const CUSTOM_LIST_PREVIEW_LIMIT = 6;

export type CustomListRow = {
  id: string;
  user_id: string;
  name: string | null;
  inserted_at: string | null;
  updated_at: string | null;
};

export type CustomListItemRow = {
  list_id: string;
  product_slug: string | null;
  inserted_at: string | null;
  updated_at: string | null;
};

export type CustomListProduct = {
  productSlug: string;
  routeSlug: string;
  name: string;
  category: string;
  imageUrl: string;
  insertedAt: string | null;
  updatedAt: string | null;
};

export type CustomList = {
  id: string;
  userId: string;
  name: string;
  insertedAt: string | null;
  updatedAt: string | null;
  itemCount: number;
  items: CustomListProduct[];
};

export type CustomListProductBase = Omit<
  CustomListProduct,
  "insertedAt" | "updatedAt"
>;

const productByRouteSlug = new Map(
  ALL_PRODUCTS.map((product) => [getProductRouteSlug(product), product] as const)
);

function getTimestampValue(value: string | null) {
  if (!value) return 0;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizeCustomListName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getCustomListNameValidationMessage(value: string) {
  const normalized = normalizeCustomListName(value);

  if (normalized.length < CUSTOM_LIST_NAME_MIN_LENGTH) {
    return `Listenname braucht mindestens ${CUSTOM_LIST_NAME_MIN_LENGTH} Zeichen.`;
  }

  if (normalized.length > CUSTOM_LIST_NAME_MAX_LENGTH) {
    return `Listenname darf maximal ${CUSTOM_LIST_NAME_MAX_LENGTH} Zeichen lang sein.`;
  }

  return null;
}

export function isValidCustomListName(value: string) {
  return getCustomListNameValidationMessage(value) === null;
}

export function isCustomListSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();

  return (
    (normalized.includes("user_custom_lists") ||
      normalized.includes("user_custom_list_items")) &&
    (normalized.includes("relation") ||
      normalized.includes("table") ||
      normalized.includes("column") ||
      normalized.includes("schema cache"))
  );
}

export function isCustomListNameConflictError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("duplicate key") ||
    normalized.includes("already exists") ||
    normalized.includes("user_custom_lists_user_name_lower_unique")
  );
}

export function mapCustomListProductBase(productSlug: string) {
  const product = productByRouteSlug.get(productSlug);

  return {
    productSlug,
    routeSlug: productSlug,
    name: product?.name ?? productSlug,
    category: product?.category ?? "Unbekannt",
    imageUrl: getProductImageUrl(product ?? { imageUrl: null }),
  };
}

export function sortCustomListsByRecent<T extends { updatedAt: string | null; insertedAt: string | null }>(
  lists: T[]
) {
  return [...lists].sort(
    (left, right) =>
      getTimestampValue(right.updatedAt || right.insertedAt) -
      getTimestampValue(left.updatedAt || left.insertedAt)
  );
}

export function buildCustomLists(
  listRows: CustomListRow[],
  itemRows: CustomListItemRow[],
  options?: {
    previewLimit?: number;
  }
) {
  const previewLimit = options?.previewLimit ?? CUSTOM_LIST_PREVIEW_LIMIT;
  const itemsByListId = new Map<string, CustomListProduct[]>();

  for (const row of itemRows) {
    if (typeof row.product_slug !== "string" || row.product_slug.trim().length === 0) {
      continue;
    }

    const item: CustomListProduct = {
      ...mapCustomListProductBase(row.product_slug),
      insertedAt: row.inserted_at,
      updatedAt: row.updated_at,
    };

    const existing = itemsByListId.get(row.list_id);
    if (existing) {
      existing.push(item);
      continue;
    }

    itemsByListId.set(row.list_id, [item]);
  }

  for (const items of itemsByListId.values()) {
    items.sort(
      (left, right) =>
        getTimestampValue(right.updatedAt || right.insertedAt) -
        getTimestampValue(left.updatedAt || left.insertedAt)
    );
  }

  return listRows
    .map((row) => {
      const name = typeof row.name === "string" ? normalizeCustomListName(row.name) : "";
      if (!name) return null;

      const items = itemsByListId.get(row.id) ?? [];

      return {
        id: row.id,
        userId: row.user_id,
        name,
        insertedAt: row.inserted_at,
        updatedAt: row.updated_at,
        itemCount: items.length,
        items: items.slice(0, previewLimit),
      } satisfies CustomList;
    })
    .filter((entry): entry is CustomList => entry !== null)
    .sort(
      (left, right) =>
        getTimestampValue(right.updatedAt || right.insertedAt) -
        getTimestampValue(left.updatedAt || left.insertedAt)
    );
}

export function applyProductBaseToCustomLists(
  lists: CustomList[],
  productBaseBySlug: Map<string, CustomListProductBase>
) {
  return lists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      const resolvedProduct = productBaseBySlug.get(item.productSlug);

      if (!resolvedProduct) {
        return item;
      }

      return {
        ...item,
        ...resolvedProduct,
      };
    }),
  }));
}
