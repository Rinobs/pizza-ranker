import {
  getCategoryNavigationItem,
  normalizeSearchText,
  type CategoryNavigationItem,
} from "@/lib/product-navigation";
import { inferImportedProductCategory } from "@/lib/imported-product-category";

export type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  quantity?: string;
  ingredients_text?: string;
  nutriments?: Record<string, unknown>;
  image_front_url?: string;
  image_url?: string;
};

export type ImportedProductDraft = {
  routeSlug: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string;
  categorySlug: CategoryNavigationItem["slug"] | null;
  imageUrl: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  sugar: number | null;
  salt: number | null;
  quantity: string | null;
  ingredientsText: string | null;
  sourceUrl: string;
};

export type ImportedProductSearchSuggestion = ImportedProductDraft & {
  searchScore: number;
};

export type OpenFoodFactsCategorySearchResponse = {
  count: number;
  page: number;
  pageSize: number;
  products: OpenFoodFactsProduct[];
};

const OPEN_FOOD_FACTS_USER_AGENT =
  process.env.OPEN_FOOD_FACTS_USER_AGENT?.trim() || null;

const DEFAULT_SEARCH_LIMIT = 8;

function slugifyRouteSegment(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "produkt";
}

function asText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(2));
  }

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    const parsed = Number(normalized);

    if (Number.isFinite(parsed)) {
      return Number(parsed.toFixed(2));
    }
  }

  return null;
}

function getSearchTokens(value: string) {
  return normalizeSearchText(value)
    .split(" ")
    .filter(Boolean);
}

function inferCategory(
  product: OpenFoodFactsProduct
): {
  categorySlug: CategoryNavigationItem["slug"];
  category: string;
} | null {
  const inferredCategory = inferImportedProductCategory({
    name: product.product_name,
    brand: product.brands,
    categories: product.categories,
    categoriesTags: product.categories_tags,
    ingredientsText: product.ingredients_text,
    protein:
      asNumber((product.nutriments ?? {})["proteins_100g"]) ??
      asNumber((product.nutriments ?? {})["proteins"]),
    quantity: product.quantity,
  });

  if (!inferredCategory) {
    return null;
  }

  return {
    categorySlug: inferredCategory.categorySlug,
    category: inferredCategory.category,
  };
}

function getDisplayCategory(
  product: OpenFoodFactsProduct,
  preferredCategorySlug?: CategoryNavigationItem["slug"] | null
) {
  const selectedCategory = preferredCategorySlug
    ? getCategoryNavigationItem(preferredCategorySlug)
    : null;

  if (selectedCategory) {
    return {
      category: selectedCategory.category,
      categorySlug: selectedCategory.slug,
    };
  }

  const inferredCategory = inferCategory(product);

  if (inferredCategory) {
    return inferredCategory;
  }

  const firstCategory =
    product.categories
      ?.split(",")
      .map((entry) => entry.trim())
      .find((entry) => entry.length > 0) ?? null;

  return {
    category: firstCategory ?? "Lebensmittel",
    categorySlug: null,
  };
}

function scoreOpenFoodFactsCandidate(
  query: string,
  product: OpenFoodFactsProduct,
  preferredCategorySlug?: CategoryNavigationItem["slug"] | null
) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = getSearchTokens(query);
  const productName = normalizeSearchText(product.product_name ?? "");
  const brand = normalizeSearchText(product.brands ?? "");
  const categories = normalizeSearchText(product.categories ?? "");

  if (!productName) {
    return 0;
  }

  const inferredCategorySlug = inferCategory(product)?.categorySlug ?? null;

  if (preferredCategorySlug && inferredCategorySlug !== preferredCategorySlug) {
    return 0;
  }

  let score = 0;

  if (productName === normalizedQuery) score += 220;
  if (productName.startsWith(normalizedQuery)) score += 160;
  if (productName.includes(normalizedQuery)) score += 120;
  if (brand.includes(normalizedQuery)) score += 60;
  if (categories.includes(normalizedQuery)) score += 30;

  let tokenHits = 0;

  for (const token of queryTokens) {
    if (productName.includes(token)) {
      score += 44;
      tokenHits += 1;
      continue;
    }

    if (brand.includes(token)) {
      score += 26;
      tokenHits += 1;
      continue;
    }

    if (categories.includes(token)) {
      score += 16;
      tokenHits += 1;
    }
  }

  if (queryTokens.length > 0 && tokenHits === 0) {
    return 0;
  }

  if (preferredCategorySlug && inferredCategorySlug === preferredCategorySlug) {
    score += 50;
  }

  if (asText(product.image_front_url) || asText(product.image_url)) {
    score += 8;
  }

  if (asText(product.code)) {
    score += 6;
  }

  return score;
}

async function fetchOpenFoodFactsJsonRequest(
  url: URL,
  options?: {
    withCustomUserAgent?: boolean;
  }
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options?.withCustomUserAgent && OPEN_FOOD_FACTS_USER_AGENT) {
    headers["User-Agent"] = OPEN_FOOD_FACTS_USER_AGENT;
  }

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenFoodFactsJson(url: URL) {
  if (OPEN_FOOD_FACTS_USER_AGENT) {
    const responseWithCustomUserAgent = await fetchOpenFoodFactsJsonRequest(url, {
      withCustomUserAgent: true,
    });

    if (responseWithCustomUserAgent) {
      return responseWithCustomUserAgent;
    }
  }

  return fetchOpenFoodFactsJsonRequest(url);
}

export function buildOpenFoodFactsSourceUrl(barcode: string) {
  return `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`;
}

export function buildOpenFoodFactsRouteSlug(
  barcode: string,
  productName: string,
  category: string
) {
  return `off-${barcode}-${slugifyRouteSegment(`${category}-${productName}`)}`;
}

export function parseOpenFoodFactsRouteSlug(routeSlug: string) {
  const match = routeSlug.match(/^off-(\d{8,14})(?:-|$)/i);
  return match ? match[1] : null;
}

export function mapOpenFoodFactsProductToImportedDraft(
  product: OpenFoodFactsProduct,
  options?: {
    preferredCategorySlug?: CategoryNavigationItem["slug"] | null;
    categoryOverride?: string | null;
    categorySlugOverride?: CategoryNavigationItem["slug"] | null;
    routeSlugOverride?: string | null;
    barcodeOverride?: string | null;
  }
): ImportedProductDraft | null {
  const barcode = asText(options?.barcodeOverride ?? product.code)?.replace(/[^\d]/g, "") ?? "";
  const name = asText(product.product_name);

  if (!barcode || !name) {
    return null;
  }

  const displayCategory = getDisplayCategory(product, options?.preferredCategorySlug);
  const category = options?.categoryOverride?.trim() || displayCategory.category;
  const categorySlug =
    options?.categorySlugOverride !== undefined
      ? options.categorySlugOverride
      : displayCategory.categorySlug;
  const nutriments = product.nutriments ?? {};

  return {
    routeSlug:
      options?.routeSlugOverride?.trim() ||
      buildOpenFoodFactsRouteSlug(barcode, name, category),
    barcode,
    name,
    brand: asText(product.brands),
    category,
    categorySlug,
    imageUrl: asText(product.image_front_url) ?? asText(product.image_url),
    kcal:
      asNumber(nutriments["energy-kcal_100g"]) ??
      asNumber(nutriments["energy-kcal"]),
    protein:
      asNumber(nutriments["proteins_100g"]) ?? asNumber(nutriments["proteins"]),
    fat: asNumber(nutriments["fat_100g"]) ?? asNumber(nutriments["fat"]),
    carbs:
      asNumber(nutriments["carbohydrates_100g"]) ??
      asNumber(nutriments["carbohydrates"]),
    sugar:
      asNumber(nutriments["sugars_100g"]) ?? asNumber(nutriments["sugars"]),
    salt: asNumber(nutriments["salt_100g"]) ?? asNumber(nutriments["salt"]),
    quantity: asText(product.quantity),
    ingredientsText: asText(product.ingredients_text),
    sourceUrl: buildOpenFoodFactsSourceUrl(barcode),
  };
}

export async function fetchOpenFoodFactsProductByBarcode(barcode: string) {
  const normalizedBarcode = barcode.replace(/[^\d]/g, "");
  if (!normalizedBarcode) {
    return null;
  }

  const url = new URL(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(normalizedBarcode)}.json`
  );

  url.searchParams.set(
    "fields",
    [
      "code",
      "product_name",
      "brands",
      "categories",
      "categories_tags",
      "quantity",
      "ingredients_text",
      "nutriments",
      "image_front_url",
      "image_url",
    ].join(",")
  );

  const json = await fetchOpenFoodFactsJson(url);
  if (json?.status !== 1 || !json.product) {
    return null;
  }

  return json.product as OpenFoodFactsProduct;
}

export async function searchOpenFoodFactsProducts(
  query: string,
  options?: {
    preferredCategorySlug?: CategoryNavigationItem["slug"] | null;
    limit?: number;
  }
) {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [] as ImportedProductSearchSuggestion[];
  }

  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", normalizedQuery);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("lc", "de");
  url.searchParams.set("cc", "de");
  url.searchParams.set("page_size", String(Math.max(options?.limit ?? DEFAULT_SEARCH_LIMIT, 8)));
  url.searchParams.set(
    "fields",
    [
      "code",
      "product_name",
      "brands",
      "categories",
      "categories_tags",
      "quantity",
      "ingredients_text",
      "nutriments",
      "image_front_url",
      "image_url",
    ].join(",")
  );

  const json = await fetchOpenFoodFactsJson(url);
  const rawProducts = Array.isArray(json?.products)
    ? (json.products as OpenFoodFactsProduct[])
    : [];

  const deduped = new Map<string, ImportedProductSearchSuggestion>();

  for (const rawProduct of rawProducts) {
    const searchScore = scoreOpenFoodFactsCandidate(
      normalizedQuery,
      rawProduct,
      options?.preferredCategorySlug
    );

    if (searchScore <= 0) {
      continue;
    }

    const mapped = mapOpenFoodFactsProductToImportedDraft(rawProduct, {
      preferredCategorySlug: options?.preferredCategorySlug,
    });

    if (!mapped) {
      continue;
    }

    const existing = deduped.get(mapped.barcode);
    if (existing && existing.searchScore >= searchScore) {
      continue;
    }

    deduped.set(mapped.barcode, {
      ...mapped,
      searchScore,
    });
  }

  return Array.from(deduped.values())
    .sort((left, right) => {
      if (right.searchScore !== left.searchScore) {
        return right.searchScore - left.searchScore;
      }

      return left.name.localeCompare(right.name, "de");
    })
    .slice(0, options?.limit ?? DEFAULT_SEARCH_LIMIT);
}

export function hasOpenFoodFactsImage(product: OpenFoodFactsProduct) {
  return Boolean(asText(product.image_front_url) ?? asText(product.image_url));
}

export function hasCompleteOpenFoodFactsNutriments(product: OpenFoodFactsProduct) {
  const nutriments = product.nutriments ?? {};

  return (
    (asNumber(nutriments["energy-kcal_100g"]) ?? asNumber(nutriments["energy-kcal"])) !== null &&
    (asNumber(nutriments["proteins_100g"]) ?? asNumber(nutriments["proteins"])) !== null &&
    (asNumber(nutriments["fat_100g"]) ?? asNumber(nutriments["fat"])) !== null &&
    (asNumber(nutriments["carbohydrates_100g"]) ?? asNumber(nutriments["carbohydrates"])) !==
      null &&
    (asNumber(nutriments["sugars_100g"]) ?? asNumber(nutriments["sugars"])) !== null &&
    (asNumber(nutriments["salt_100g"]) ?? asNumber(nutriments["salt"])) !== null
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchOpenFoodFactsProductsByCategoryTag(
  categoryTag: string,
  options?: {
    countryTag?: string;
    page?: number;
    pageSize?: number;
  }
) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.max(1, Math.min(options?.pageSize ?? 100, 200));
  const countryTag = options?.countryTag?.trim() || "en:germany";
  const url = new URL("https://world.openfoodfacts.org/api/v2/search");

  url.searchParams.set("categories_tags_en", categoryTag);
  url.searchParams.set("countries_tags", countryTag);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  url.searchParams.set(
    "fields",
    [
      "code",
      "product_name",
      "brands",
      "categories",
      "categories_tags",
      "quantity",
      "ingredients_text",
      "nutriments",
      "image_front_url",
      "image_url",
    ].join(",")
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const json = await fetchOpenFoodFactsJson(url);

    if (json && Array.isArray(json.products)) {
      return {
        count: typeof json.count === "number" ? json.count : json.products.length,
        page,
        pageSize,
        products: json.products as OpenFoodFactsProduct[],
      } satisfies OpenFoodFactsCategorySearchResponse;
    }

    if (attempt < 2) {
      await wait((attempt + 1) * 2000);
    }
  }

  return null;
}
