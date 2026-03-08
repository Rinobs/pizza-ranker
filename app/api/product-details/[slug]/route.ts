import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ALL_PRODUCTS, getProductRouteSlug, type Product } from "@/app/data/products";

export const runtime = "nodejs";

const PLACEHOLDER_TEXT = "9999";
const PLACEHOLDER_NUMBER = 9999;

type OpenFoodFactsProduct = {
  product_name?: string;
  brands?: string;
  quantity?: string;
  ingredients_text?: string;
  nutriments?: Record<string, unknown>;
};

type RatingRow = {
  rating: number | null;
  comment: string | null;
};

type ProductDetails = {
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
  kommentare: string[];
  quelle: "online" | "placeholder";
};

function asText(value: unknown): string {
  if (typeof value !== "string") return PLACEHOLDER_TEXT;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : PLACEHOLDER_TEXT;
}

function asNumber(value: unknown): number | null {
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

function getDefaultDetails(product: Product): ProductDetails {
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
    kommentare: [PLACEHOLDER_TEXT],
    quelle: "placeholder",
  };
}

function extractBarcodeFromOpenFoodFactsImage(imageUrl: string): string | null {
  const match = imageUrl.match(
    /images\.openfoodfacts\.org\/images\/products\/(\d{3})\/(\d{3})\/(\d{3})\/(\d+)/i
  );

  if (!match) return null;
  return `${match[1]}${match[2]}${match[3]}${match[4]}`;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreCandidate(query: string, candidate: OpenFoodFactsProduct): number {
  const queryTokens = normalizeText(query)
    .split(" ")
    .filter((token) => token.length >= 3);

  const name = normalizeText(candidate.product_name || "");
  if (!name) return 0;

  let tokenHits = 0;
  for (const token of queryTokens) {
    if (name.includes(token)) tokenHits += 1;
  }

  const brand = normalizeText(candidate.brands || "");
  const brandBoost = queryTokens.some((token) => brand.includes(token)) ? 0.2 : 0;
  const exactBoost = name === normalizeText(query) ? 0.5 : 0;

  const base = queryTokens.length > 0 ? tokenHits / queryTokens.length : 0;
  return base + brandBoost + exactBoost;
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FoodRanker/1.0 (+https://foodranker.local)",
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function findOpenFoodFactsMatch(product: Product): Promise<OpenFoodFactsProduct | null> {
  const barcode = extractBarcodeFromOpenFoodFactsImage(product.imageUrl || "");

  if (barcode) {
    const barcodeResponse = await fetchJson(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );

    const barcodeProduct = barcodeResponse?.product as OpenFoodFactsProduct | undefined;
    if (barcodeProduct?.product_name) {
      return barcodeProduct;
    }
  }

  const searchQuery = encodeURIComponent(product.name);
  const searchResponse = await fetchJson(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${searchQuery}&search_simple=1&action=process&json=1&page_size=25&fields=product_name,brands,quantity,ingredients_text,nutriments`
  );

  const candidates = Array.isArray(searchResponse?.products)
    ? (searchResponse.products as OpenFoodFactsProduct[])
    : [];

  if (candidates.length === 0) return null;

  let best: OpenFoodFactsProduct | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = scoreCandidate(product.name, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best || bestScore < 0.6) return null;
  return best;
}

function mergeOnlineDetails(base: ProductDetails, online: OpenFoodFactsProduct): ProductDetails {
  const nutriments = online.nutriments || {};

  const kcal =
    asNumber(nutriments["energy-kcal_100g"]) ??
    asNumber(nutriments["energy-kcal"]) ??
    asNumber(nutriments["energy_100g"]);
  const protein = asNumber(nutriments["proteins_100g"]) ?? asNumber(nutriments["proteins"]);
  const fat = asNumber(nutriments["fat_100g"]) ?? asNumber(nutriments["fat"]);
  const carbs =
    asNumber(nutriments["carbohydrates_100g"]) ?? asNumber(nutriments["carbohydrates"]);

  return {
    ...base,
    marke: asText((online.brands || "").split(",")[0]),
    gewicht: asText(online.quantity),
    zutaten: asText(online.ingredients_text),
    naehrwerte: {
      kcal: kcal ?? base.naehrwerte.kcal,
      protein: protein ?? base.naehrwerte.protein,
      fat: fat ?? base.naehrwerte.fat,
      carbs: carbs ?? base.naehrwerte.carbs,
    },
    quelle: "online",
  };
}

async function loadRatingSummary(routeSlug: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      durchschnittsbewertung: PLACEHOLDER_NUMBER,
      kommentare: [PLACEHOLDER_TEXT],
    };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("ratings")
    .select("rating, comment")
    .eq("product_slug", routeSlug);

  if (error || !Array.isArray(data)) {
    return {
      durchschnittsbewertung: PLACEHOLDER_NUMBER,
      kommentare: [PLACEHOLDER_TEXT],
    };
  }

  const rows = data as RatingRow[];
  const numericRatings = rows
    .map((row) => row.rating)
    .filter((value): value is number => typeof value === "number" && value > 0);

  const average =
    numericRatings.length > 0
      ? Number(
          (numericRatings.reduce((sum, value) => sum + value, 0) / numericRatings.length).toFixed(2)
        )
      : PLACEHOLDER_NUMBER;

  const comments = rows
    .map((row) => (typeof row.comment === "string" ? row.comment.trim() : ""))
    .filter((value) => value.length > 0);

  return {
    durchschnittsbewertung: average,
    kommentare: comments.length > 0 ? comments : [PLACEHOLDER_TEXT],
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "ungueltiger slug" }, { status: 400 });
  }

  const product = ALL_PRODUCTS.find((item) => getProductRouteSlug(item) === slug);

  if (!product) {
    return NextResponse.json({ error: "produkt nicht gefunden" }, { status: 404 });
  }

  const base = getDefaultDetails(product);

  const [onlineMatch, ratingSummary] = await Promise.all([
    findOpenFoodFactsMatch(product),
    loadRatingSummary(slug),
  ]);

  const merged = onlineMatch ? mergeOnlineDetails(base, onlineMatch) : base;

  const payload = {
    ...merged,
    durchschnittsbewertung: ratingSummary.durchschnittsbewertung,
    kommentare: ratingSummary.kommentare,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}