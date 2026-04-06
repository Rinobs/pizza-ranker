import {
  DEFAULT_PRODUCT_IMAGE,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
  ALL_PRODUCTS,
} from "@/app/data/products";
import { normalizeSearchText, type CategoryNavigationItem } from "@/lib/product-navigation";
import { IMPORTED_PRODUCTS_TABLE, getSupabaseAdminClient } from "@/lib/supabase";
import { type ImportedProductDraft } from "@/lib/open-food-facts";

type ImportedProductRow = {
  route_slug: string;
  source: string;
  source_id: string;
  source_url: string | null;
  name: string;
  brand: string | null;
  category: string;
  category_slug: string | null;
  image_url: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  sugar: number | null;
  salt: number | null;
  quantity: string | null;
  ingredients_text: string | null;
  inserted_at: string | null;
  updated_at: string | null;
};

export type ImportedProductRecord = ImportedProductDraft & {
  insertedAt: string | null;
  updatedAt: string | null;
};

export type ImportedProductSearchResult = ImportedProductRecord & {
  searchScore: number;
};

export type ImportedCatalogProduct = Product & {
  routeSlug: string;
  brand: string | null;
  sourceType: "open_food_facts";
  sourceLabel: string;
  sourceUrl: string;
  barcode: string;
  quantity: string | null;
  ingredientsText: string | null;
  sugar: number | null;
  salt: number | null;
};

export type ResolvedProductSummary = {
  productSlug: string;
  routeSlug: string;
  name: string;
  category: string;
  imageUrl: string;
  sourceType: "catalog" | "open_food_facts" | "unknown";
};

const productByRouteSlug = new Map(
  ALL_PRODUCTS.map((product) => [getProductRouteSlug(product), product] as const)
);

const SELECT_FIELDS = [
  "route_slug",
  "source",
  "source_id",
  "source_url",
  "name",
  "brand",
  "category",
  "category_slug",
  "image_url",
  "kcal",
  "protein",
  "fat",
  "carbs",
  "sugar",
  "salt",
  "quantity",
  "ingredients_text",
  "inserted_at",
  "updated_at",
].join(", ");

function mapImportedProductRow(row: ImportedProductRow): ImportedProductRecord {
  return {
    routeSlug: row.route_slug,
    barcode: row.source_id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    categorySlug:
      typeof row.category_slug === "string" &&
      row.category_slug.trim().length > 0
        ? (row.category_slug.trim() as CategoryNavigationItem["slug"])
        : null,
    imageUrl: row.image_url,
    kcal: row.kcal,
    protein: row.protein,
    fat: row.fat,
    carbs: row.carbs,
    sugar: row.sugar,
    salt: row.salt,
    quantity: row.quantity,
    ingredientsText: row.ingredients_text,
    sourceUrl: row.source_url || "",
    insertedAt: row.inserted_at,
    updatedAt: row.updated_at,
  };
}

function isImportedProductRow(value: unknown): value is ImportedProductRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const row = value as Partial<ImportedProductRow>;

  return (
    typeof row.route_slug === "string" &&
    typeof row.source === "string" &&
    typeof row.source_id === "string" &&
    typeof row.name === "string" &&
    typeof row.category === "string"
  );
}

function scoreImportedProduct(query: string, product: ImportedProductRecord) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const name = normalizeSearchText(product.name);
  const brand = normalizeSearchText(product.brand ?? "");
  const category = normalizeSearchText(product.category);

  if (!name || !normalizedQuery) {
    return 0;
  }

  let score = 0;

  if (name === normalizedQuery) score += 220;
  if (name.startsWith(normalizedQuery)) score += 160;
  if (name.includes(normalizedQuery)) score += 120;
  if (brand.includes(normalizedQuery)) score += 60;
  if (category.includes(normalizedQuery)) score += 30;

  let tokenHits = 0;

  for (const token of queryTokens) {
    if (name.includes(token)) {
      score += 44;
      tokenHits += 1;
      continue;
    }

    if (brand.includes(token)) {
      score += 26;
      tokenHits += 1;
      continue;
    }

    if (category.includes(token)) {
      score += 16;
      tokenHits += 1;
    }
  }

  if (queryTokens.length > 0 && tokenHits === 0) {
    return 0;
  }

  return score;
}

export function isImportedProductsSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("imported_products") &&
    (normalized.includes("relation") ||
      normalized.includes("table") ||
      normalized.includes("column") ||
      normalized.includes("schema cache"))
  );
}

export async function getImportedProductByRouteSlug(routeSlug: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select(SELECT_FIELDS)
    .eq("route_slug", routeSlug)
    .maybeSingle();

  if (error || !isImportedProductRow(data)) {
    return null;
  }

  return mapImportedProductRow(data);
}

export async function getImportedProductByBarcode(barcode: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select(SELECT_FIELDS)
    .eq("source_id", barcode)
    .maybeSingle();

  if (error || !isImportedProductRow(data)) {
    return null;
  }

  return mapImportedProductRow(data);
}

export async function getImportedProductsByRouteSlugs(routeSlugs: string[]) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return new Map<string, ImportedProductRecord>();
  }

  const normalizedRouteSlugs = Array.from(
    new Set(
      routeSlugs
        .map((routeSlug) => routeSlug.trim())
        .filter((routeSlug) => routeSlug.length > 0)
    )
  );

  if (normalizedRouteSlugs.length === 0) {
    return new Map<string, ImportedProductRecord>();
  }

  const { data, error } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select(SELECT_FIELDS)
    .in("route_slug", normalizedRouteSlugs);

  if (error || !Array.isArray(data)) {
    return new Map<string, ImportedProductRecord>();
  }

  return new Map(
    (data as unknown[])
      .filter(isImportedProductRow)
      .map((row) => {
        const product = mapImportedProductRow(row);
        return [product.routeSlug, product] as const;
      })
  );
}

export async function getExistingImportedBarcodes(barcodes: string[]) {
  const supabase = getSupabaseAdminClient();

  if (!supabase || barcodes.length === 0) {
    return new Set<string>();
  }

  const normalizedBarcodes = Array.from(
    new Set(
      barcodes
        .map((barcode) => barcode.replace(/[^\d]/g, "").trim())
        .filter((barcode) => barcode.length > 0)
    )
  );

  if (normalizedBarcodes.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select("source_id")
    .in("source_id", normalizedBarcodes);

  if (error || !Array.isArray(data)) {
    return new Set<string>();
  }

  return new Set(
    data
      .map((entry) =>
        typeof (entry as { source_id?: unknown }).source_id === "string"
          ? (entry as { source_id: string }).source_id
          : null
      )
      .filter((barcode): barcode is string => Boolean(barcode))
  );
}

export async function persistImportedProduct(draft: ImportedProductDraft) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const existing = await getImportedProductByBarcode(draft.barcode);
  const now = new Date().toISOString();

  const payload = {
    route_slug: existing?.routeSlug ?? draft.routeSlug,
    source: "open_food_facts",
    source_id: draft.barcode,
    source_url: draft.sourceUrl,
    name: draft.name,
    brand: draft.brand,
    category: draft.category,
    category_slug: draft.categorySlug,
    image_url: draft.imageUrl,
    kcal: draft.kcal,
    protein: draft.protein,
    fat: draft.fat,
    carbs: draft.carbs,
    sugar: draft.sugar,
    salt: draft.salt,
    quantity: draft.quantity,
    ingredients_text: draft.ingredientsText,
    inserted_at: existing?.insertedAt ?? now,
    updated_at: now,
  };

  const query = existing
    ? supabase
        .from(IMPORTED_PRODUCTS_TABLE)
        .update(payload)
        .eq("source_id", draft.barcode)
        .select(SELECT_FIELDS)
        .single()
    : supabase
        .from(IMPORTED_PRODUCTS_TABLE)
        .insert(payload)
        .select(SELECT_FIELDS)
        .single();

  const { data, error } = await query;

  if (error || !isImportedProductRow(data)) {
    return null;
  }

  return mapImportedProductRow(data);
}

export async function searchImportedProducts(
  query: string,
  options?: {
    categorySlug?: CategoryNavigationItem["slug"] | null;
    limit?: number;
  }
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [] as ImportedProductSearchResult[];
  }

  let builder = supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select(SELECT_FIELDS)
    .order("updated_at", { ascending: false })
    .limit(150);

  if (options?.categorySlug) {
    builder = builder.eq("category_slug", options.categorySlug);
  }

  const { data, error } = await builder;

  if (error || !Array.isArray(data)) {
    return [];
  }

  const rows = data as unknown[];

  return rows
    .filter(isImportedProductRow)
    .map((row) => mapImportedProductRow(row))
    .map((product) => ({
      ...product,
      searchScore: scoreImportedProduct(query, product),
    }))
    .filter((product) => product.searchScore > 0)
    .sort((left, right) => {
      if (right.searchScore !== left.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return left.name.localeCompare(right.name, "de");
    })
    .slice(0, options?.limit ?? 8);
}

export async function getImportedCatalogProducts(options?: {
  categorySlug?: CategoryNavigationItem["slug"] | null;
  limit?: number;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [] as ImportedCatalogProduct[];
  }

  let builder = supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select(SELECT_FIELDS)
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(options?.limit ?? 400, 2000)));

  if (options?.categorySlug) {
    builder = builder.eq("category_slug", options.categorySlug);
  }

  const { data, error } = await builder;

  if (error || !Array.isArray(data)) {
    return [] as ImportedCatalogProduct[];
  }

  return (data as unknown[])
    .filter(isImportedProductRow)
    .map((row) => mapImportedProductRow(row))
    .map((product) => toImportedCatalogProduct(product));
}

export async function getImportedCatalogProductsByCategorySlug(
  categorySlug: CategoryNavigationItem["slug"],
  options?: {
    limit?: number;
  }
) {
  return getImportedCatalogProducts({
    categorySlug,
    limit: options?.limit,
  });
}

export async function resolveProductSummariesByRouteSlug(routeSlugs: string[]) {
  const normalizedRouteSlugs = Array.from(
    new Set(
      routeSlugs
        .map((routeSlug) => routeSlug.trim())
        .filter((routeSlug) => routeSlug.length > 0)
    )
  );

  const resolvedProducts = new Map<string, ResolvedProductSummary>();
  const unresolvedRouteSlugs: string[] = [];

  for (const routeSlug of normalizedRouteSlugs) {
    const catalogProduct = productByRouteSlug.get(routeSlug);

    if (catalogProduct) {
      resolvedProducts.set(routeSlug, {
        productSlug: routeSlug,
        routeSlug,
        name: catalogProduct.name,
        category: catalogProduct.category,
        imageUrl: getProductImageUrl(catalogProduct),
        sourceType: "catalog",
      });
      continue;
    }

    unresolvedRouteSlugs.push(routeSlug);
  }

  if (unresolvedRouteSlugs.length > 0) {
    const importedProductsBySlug = await getImportedProductsByRouteSlugs(
      unresolvedRouteSlugs
    );

    for (const routeSlug of unresolvedRouteSlugs) {
      const importedProduct = importedProductsBySlug.get(routeSlug);

      if (importedProduct) {
        resolvedProducts.set(routeSlug, {
          productSlug: routeSlug,
          routeSlug,
          name: importedProduct.name,
          category: importedProduct.category,
          imageUrl: getProductImageUrl({ imageUrl: importedProduct.imageUrl }),
          sourceType: "open_food_facts",
        });
        continue;
      }

      resolvedProducts.set(routeSlug, {
        productSlug: routeSlug,
        routeSlug,
        name: routeSlug,
        category: "Unbekannt",
        imageUrl: DEFAULT_PRODUCT_IMAGE,
        sourceType: "unknown",
      });
    }
  }

  return resolvedProducts;
}

export function toImportedCatalogProduct(
  product: ImportedProductDraft | ImportedProductRecord
): ImportedCatalogProduct {
  return {
    routeSlug: product.routeSlug,
    name: product.name,
    imageUrl: product.imageUrl || DEFAULT_PRODUCT_IMAGE,
    category: product.category,
    slug: product.categorySlug ?? "imported",
    kcal: product.kcal ?? undefined,
    protein: product.protein ?? undefined,
    fat: product.fat ?? undefined,
    carbs: product.carbs ?? undefined,
    brand: product.brand,
    sourceType: "open_food_facts",
    sourceLabel: "Open Food Facts",
    sourceUrl: product.sourceUrl,
    barcode: product.barcode,
    quantity: product.quantity,
    ingredientsText: product.ingredientsText,
    sugar: product.sugar,
    salt: product.salt,
  };
}
