import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getSupabaseAdminClient,
  RATINGS_TABLE,
  USER_PROFILES_TABLE,
} from "@/lib/supabase";
import { ALL_PRODUCTS, getProductRouteSlug, type Product } from "@/app/data/products";
import { getStableUserId } from "@/lib/user-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLACEHOLDER_TEXT = "9999";
const PLACEHOLDER_NUMBER = 9999;

const FALLBACK_USERNAME = "Anonym";

type OpenFoodFactsProduct = {
  product_name?: string;
  brands?: string;
  quantity?: string;
  ingredients_text?: string;
  nutriments?: Record<string, unknown>;
};

type RatingRow = {
  user_id: string;
  rating: number | null;
  comment: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
};

type ProductComment = {
  username: string;
  text: string;
  updatedAt: string | null;
  isOwnComment: boolean;
};

type AminoAcidEntry = {
  name: string;
  amount: string;
};

type ProductDetails = {
  marke: string;
  gewicht: string;
  preis: string;
  kategorie?: string | null;
  zutaten: string;
  naehrwerte: {
    energyKj?: number | string;
    kcal: number | string;
    protein: number | string;
    fat: number | string;
    saturatedFat?: number | string;
    carbs: number | string;
    sugar?: number | string;
    ballaststoffe?: number | string;
    salz?: number | string;
  };
  aminosaeurenprofil?: AminoAcidEntry[];
  durchschnittsbewertung: number | string;
  kommentare: ProductComment[];
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
    kategorie: null,
    zutaten: PLACEHOLDER_TEXT,
    naehrwerte: {
      energyKj: PLACEHOLDER_NUMBER,
      kcal: typeof product.kcal === "number" ? product.kcal : PLACEHOLDER_NUMBER,
      protein: typeof product.protein === "number" ? product.protein : PLACEHOLDER_NUMBER,
      fat: typeof product.fat === "number" ? product.fat : PLACEHOLDER_NUMBER,
      saturatedFat: PLACEHOLDER_NUMBER,
      carbs: typeof product.carbs === "number" ? product.carbs : PLACEHOLDER_NUMBER,
      sugar: PLACEHOLDER_NUMBER,
      ballaststoffe: PLACEHOLDER_NUMBER,
      salz: PLACEHOLDER_NUMBER,
    },
    aminosaeurenprofil: [],
    durchschnittsbewertung: PLACEHOLDER_NUMBER,
    kommentare: [],
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

  const energyKj =
    asNumber(nutriments["energy-kj_100g"]) ??
    asNumber(nutriments["energy-kj"]) ??
    asNumber(nutriments["energy_100g"]);
  const kcal =
    asNumber(nutriments["energy-kcal_100g"]) ??
    asNumber(nutriments["energy-kcal"]) ??
    (energyKj !== null ? Number((energyKj / 4.184).toFixed(2)) : null);
  const protein = asNumber(nutriments["proteins_100g"]) ?? asNumber(nutriments["proteins"]);
  const fat = asNumber(nutriments["fat_100g"]) ?? asNumber(nutriments["fat"]);
  const saturatedFat =
    asNumber(nutriments["saturated-fat_100g"]) ?? asNumber(nutriments["saturated-fat"]);
  const carbs =
    asNumber(nutriments["carbohydrates_100g"]) ?? asNumber(nutriments["carbohydrates"]);
  const sugar = asNumber(nutriments["sugars_100g"]) ?? asNumber(nutriments["sugars"]);
  const ballaststoffe = asNumber(nutriments["fiber_100g"]) ?? asNumber(nutriments["fiber"]);
  const salz = asNumber(nutriments["salt_100g"]) ?? asNumber(nutriments["salt"]);

  return {
    ...base,
    marke: asText((online.brands || "").split(",")[0]),
    gewicht: asText(online.quantity),
    zutaten: asText(online.ingredients_text),
    naehrwerte: {
      energyKj: energyKj ?? base.naehrwerte.energyKj,
      kcal: kcal ?? base.naehrwerte.kcal,
      protein: protein ?? base.naehrwerte.protein,
      fat: fat ?? base.naehrwerte.fat,
      saturatedFat: saturatedFat ?? base.naehrwerte.saturatedFat,
      carbs: carbs ?? base.naehrwerte.carbs,
      sugar: sugar ?? base.naehrwerte.sugar,
      ballaststoffe: ballaststoffe ?? base.naehrwerte.ballaststoffe,
      salz: salz ?? base.naehrwerte.salz,
    },
    quelle: "online",
  };
}

function mergeDetails(base: ProductDetails, override: Partial<ProductDetails>): ProductDetails {
  return {
    ...base,
    ...override,
    naehrwerte: {
      ...base.naehrwerte,
      ...(override.naehrwerte || {}),
    },
  };
}

function getManualDetails(product: Product): Partial<ProductDetails> | null {
  const manualDetailsByName: Record<string, Partial<ProductDetails>> = {
    "Dr. Oetker Ristorante Mozzarella": {
      marke: "Dr. Oetker",
      gewicht: "355 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Tomaten, Mozzarella, Kräuter-Pesto, Weizenmehl-Teig",
      naehrwerte: { kcal: "238 kcal /100 g", protein: "10 g /100 g", fat: "11 g /100 g", carbs: "23 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Margherita": {
      marke: "Dr. Oetker",
      gewicht: "ca. 320 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Tomatensoße, Mozzarella, Weizenteig, Kräuter",
      naehrwerte: { kcal: "ca. 220 kcal /100 g", protein: "ca. 9 g /100 g", fat: "ca. 9 g /100 g", carbs: "ca. 26 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Funghi": {
      marke: "Dr. Oetker",
      gewicht: "ca. 365 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Champignons, Käse, Tomatensoße, Weizenteig",
      naehrwerte: { kcal: "ca. 210 kcal /100 g", protein: "ca. 9 g /100 g", fat: "ca. 8 g /100 g", carbs: "ca. 26 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Salame": {
      marke: "Dr. Oetker",
      gewicht: "ca. 320 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Salami, Tomaten, Mozzarella, Edamer, Weizenteig",
      naehrwerte: { kcal: "ca. 250 kcal /100 g", protein: "ca. 11 g /100 g", fat: "ca. 12 g /100 g", carbs: "ca. 24 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Speciale": {
      marke: "Dr. Oetker",
      gewicht: "ca. 345 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Schinken, Salami, Peperoni-Salami, Champignons, Käse",
      naehrwerte: { kcal: "ca. 260 kcal /100 g", protein: "ca. 11 g /100 g", fat: "ca. 13 g /100 g", carbs: "ca. 23 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Pollo": {
      marke: "Dr. Oetker",
      gewicht: "ca. 355 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Hähnchenfleisch, Käse, Tomaten, Gewürze",
      naehrwerte: { kcal: "ca. 240 kcal /100 g", protein: "ca. 12 g /100 g", fat: "ca. 9 g /100 g", carbs: "ca. 26 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Quattro Formaggi": {
      marke: "Dr. Oetker",
      gewicht: "ca. 340 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Mozzarella, Edamer, Emmentaler, Blauschimmelkäse",
      naehrwerte: { kcal: "ca. 270 kcal /100 g", protein: "ca. 11 g /100 g", fat: "ca. 15 g /100 g", carbs: "ca. 23 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Prosciutto": {
      marke: "Dr. Oetker",
      gewicht: "ca. 330 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Kochschinken, Mozzarella, Tomatensoße",
      naehrwerte: { kcal: "ca. 230 kcal /100 g", protein: "ca. 11 g /100 g", fat: "ca. 10 g /100 g", carbs: "ca. 25 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Hawaii": {
      marke: "Dr. Oetker",
      gewicht: "ca. 350 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Schinken, Ananas, Käse, Tomaten",
      naehrwerte: { kcal: "ca. 235 kcal /100 g", protein: "ca. 10 g /100 g", fat: "ca. 9 g /100 g", carbs: "ca. 27 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Spinaci": {
      marke: "Dr. Oetker",
      gewicht: "ca. 390 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Blattspinat, Käse, Tomatensoße",
      naehrwerte: { kcal: "ca. 210 kcal /100 g", protein: "ca. 9 g /100 g", fat: "ca. 8 g /100 g", carbs: "ca. 26 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Margherita Pomodori": {
      marke: "Dr. Oetker",
      gewicht: "ca. 330 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Tomaten, Mozzarella, Basilikum",
      naehrwerte: { kcal: "ca. 220 kcal /100 g", protein: "ca. 9 g /100 g", fat: "ca. 9 g /100 g", carbs: "ca. 26 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Tonno": {
      marke: "Dr. Oetker",
      gewicht: "ca. 355 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Thunfisch, Zwiebeln, Käse, Tomaten",
      naehrwerte: { kcal: "ca. 235 kcal /100 g", protein: "ca. 12 g /100 g", fat: "ca. 9 g /100 g", carbs: "ca. 24 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Ristorante Pepperoni Salame": {
      marke: "Dr. Oetker",
      gewicht: "ca. 320 g",
      preis: "ca. 3,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Peperoni-Salami, Käse, Tomatensoße",
      naehrwerte: { kcal: "ca. 260 kcal /100 g", protein: "ca. 11 g /100 g", fat: "ca. 13 g /100 g", carbs: "ca. 24 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Speciale": {
      marke: "Dr. Oetker",
      gewicht: "ca. 400 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Weizenmehl-Teig, Tomatenpüree, Mozzarella, Salami, Kochschinken, Champignons, Olivenöl, Gewürze.",
      naehrwerte: { kcal: "228 kcal /100 g", protein: "9,7 g /100 g", fat: "7,9 g /100 g", carbs: "28 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Salame": {
      marke: "Dr. Oetker",
      gewicht: "ca. 320 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Tomaten, Mozzarella, Salami, Weizenteig, Olivenöl, Gewürze.",
      naehrwerte: { kcal: "256 kcal /100 g", protein: "10,3 g /100 g", fat: "9 g /100 g", carbs: "32,2 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Mozzarella E Pesto": {
      marke: "Dr. Oetker",
      gewicht: "ca. 385 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Mozzarella, Tomatenpüree, Cherrytomaten, Basilikum-Pesto, Pecorino, Weizenteig.",
      naehrwerte: { kcal: "239 kcal /100 g", protein: "8,6 g /100 g", fat: "9,1 g /100 g", carbs: "30 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Tonno": {
      marke: "Dr. Oetker",
      gewicht: "ca. 355 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Thunfisch, Tomaten, Käse, Zwiebeln, Weizenteig.",
      naehrwerte: { kcal: "216 kcal /100 g", protein: "10,5 g /100 g", fat: "6,6 g /100 g", carbs: "27,5 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Margherita": {
      marke: "Dr. Oetker",
      gewicht: "ca. 350 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Tomatensoße, Mozzarella, Weizenteig, Olivenöl, Kräuter.",
      naehrwerte: { kcal: "ca. 239 kcal /100 g", protein: "ca. 10 g /100 g", fat: "ca. 7-8 g /100 g", carbs: "ca. 31 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Quattro Formaggi": {
      marke: "Dr. Oetker",
      gewicht: "ca. 360 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Mozzarella, Emmentaler, Edamer, Blauschimmelkäse, Tomatensoße, Weizenteig.",
      naehrwerte: { kcal: "ca. 260 kcal /100 g", protein: "ca. 11 g /100 g", fat: "ca. 13 g /100 g", carbs: "ca. 24 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Spinaci E Ricotta": {
      marke: "Dr. Oetker",
      gewicht: "ca. 365 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Spinat, Ricotta, Käse, Tomaten, Weizenteig.",
      naehrwerte: { kcal: "ca. 226 kcal /100 g", protein: "ca. 7,5 g /100 g", fat: "ca. 8 g /100 g", carbs: "ca. 29 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker Tradizionale Diavola Calabrese": {
      marke: "Dr. Oetker",
      gewicht: "ca. 330 g",
      preis: "ca. 3,49-4,19 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Scharfe Salami (Calabrese), Tomaten, Mozzarella, Chili-Gewürze.",
      naehrwerte: { kcal: "ca. 234 kcal /100 g", protein: "ca. 9,3 g /100 g", fat: "ca. 7 g /100 g", carbs: "ca. 32 g /100 g" },
      quelle: "placeholder",
    },
    "Dr. Oetker SUPREMA Salami": {
      marke: "Dr. Oetker",
      gewicht: "487 g",
      preis: "ca. 3,99-5,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Weizenmehl, passierte Tomaten (ca. 23 %), Mozzarella (ca. 15 %), Salami (ca. 8 %), Olivenöl, Hefe, Basilikum, Oregano.",
      naehrwerte: {
        kcal: "234 kcal /100 g (ca. 1140 kcal pro Pizza)",
        protein: "10 g /100 g",
        fat: "8,9 g /100 g",
        carbs: "28 g /100 g",
      },
      quelle: "placeholder",
    },
    "Dr. Oetker SUPREMA Calabrese & Nduja": {
      marke: "Dr. Oetker",
      gewicht: "ca. 520 g",
      preis: "ca. 4,49-5,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Weizenteig, Tomatensoße, Mozzarella, scharfe Calabrese-Salami, 'Nduja-Wurst, Paprika, Gewürze.",
      naehrwerte: {
        kcal: "231 kcal /100 g",
        protein: "ca. 9,2 g /100 g",
        fat: "9,1 g /100 g",
        carbs: "27 g /100 g",
      },
      quelle: "placeholder",
    },
    "Dr. Oetker SUPREMA Margherita": {
      marke: "Dr. Oetker",
      gewicht: "ca. 475 g",
      preis: "ca. 4,49-5,49 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Weizenmehl-Teig, Tomaten, Mozzarella, Grana Padano, Olivenöl, Basilikum.",
      naehrwerte: {
        kcal: "ca. 231-235 kcal /100 g (ca. 1100 kcal pro Pizza)",
        protein: "ca. 10 g /100 g",
        fat: "ca. 8-9 g /100 g",
        carbs: "ca. 28 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Margherita": {
      marke: "Wagner",
      gewicht: "ca. 300 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Weizenmehl-Teig, Tomatensoße, Mozzarella, Olivenöl, Kräuter.",
      naehrwerte: {
        kcal: "242 kcal /100 g (ca. 727 kcal pro Pizza)",
        protein: "10,9 g /100 g",
        fat: "8,9 g /100 g",
        carbs: "28,7 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Salami": {
      marke: "Wagner",
      gewicht: "320 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Tomatensoße, Mozzarella, Edelsalami, Weizenteig.",
      naehrwerte: {
        kcal: "252 kcal /100 g (ca. 865 kcal pro Pizza)",
        protein: "10,9 g /100 g",
        fat: "10,4 g /100 g",
        carbs: "27,6 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Speciale": {
      marke: "Wagner",
      gewicht: "350 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Salami, Kochschinken, Champignons, Mozzarella, Tomatensoße.",
      naehrwerte: {
        kcal: "232 kcal /100 g (ca. 812 kcal pro Pizza)",
        protein: "10,4 g /100 g",
        fat: "11,1 g /100 g",
        carbs: "21,8 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Peperoni-Salami": {
      marke: "Wagner",
      gewicht: "ca. 320 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Scharfe Peperoni-Salami, Mozzarella, Tomaten, Weizenteig.",
      naehrwerte: {
        kcal: "ca. 250 kcal /100 g",
        protein: "ca. 11 g /100 g",
        fat: "ca. 10-11 g /100 g",
        carbs: "ca. 27 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Hawaii": {
      marke: "Wagner",
      gewicht: "ca. 350 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Kochschinken, Ananas, Mozzarella, Tomaten.",
      naehrwerte: {
        kcal: "ca. 220 kcal /100 g",
        protein: "ca. 9-10 g /100 g",
        fat: "ca. 8-9 g /100 g",
        carbs: "ca. 28 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Tonno": {
      marke: "Wagner",
      gewicht: "ca. 350 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Thunfisch, Zwiebeln, Tomatensoße, Käse.",
      naehrwerte: {
        kcal: "ca. 220 kcal /100 g",
        protein: "ca. 11 g /100 g",
        fat: "ca. 7-8 g /100 g",
        carbs: "ca. 26 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Spinat": {
      marke: "Wagner",
      gewicht: "ca. 350 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Spinat, Käse, Tomatensoße, Weizenteig.",
      naehrwerte: {
        kcal: "ca. 210 kcal /100 g",
        protein: "ca. 9 g /100 g",
        fat: "ca. 8 g /100 g",
        carbs: "ca. 26 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Piccolinis Salami": {
      marke: "Wagner",
      gewicht: "ca. 270 g Packung",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Salami, Käse, Tomatensoße.",
      naehrwerte: {
        kcal: "251 kcal /100 g",
        protein: "ca. 10 g /100 g",
        fat: "ca. 11 g /100 g",
        carbs: "ca. 26 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Piccolinis Speciale": {
      marke: "Wagner",
      gewicht: "ca. 270 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Salami, Schinken, Champignons, Käse.",
      naehrwerte: {
        kcal: "226 kcal /100 g",
        protein: "ca. 9-10 g /100 g",
        fat: "ca. 9 g /100 g",
        carbs: "ca. 26 g /100 g",
      },
      quelle: "placeholder",
    },
    "Wagner Steinofen Piccolinis Elsässer Art": {
      marke: "Wagner",
      gewicht: "ca. 270 g",
      preis: "ca. 2,99-3,79 €",
      kategorie: "Tiefkühlpizza",
      zutaten: "Speck, Zwiebeln, Crème-Fraîche-Soße.",
      naehrwerte: {
        kcal: "ca. 238 kcal /100 g",
        protein: "ca. 7 g /100 g",
        fat: "ca. 10 g /100 g",
        carbs: "ca. 28 g /100 g",
      },
      quelle: "placeholder",
    },
    "Gustavo Gusto New York Style": {
      marke: "Gustavo Gusto",
      gewicht: "465 g pro Pizza",
      preis: "ca. 4,69 € - 5,69 €",
      kategorie: "Tiefkühlpizza (Steinofen-Style)",
      zutaten:
        "Teig (ca. 47 %): Weizenmehl, Wasser, natives Olivenöl extra, Salz, Frischhefe. Tomatensoße (ca. 23 %): gehackte Tomaten, Tomatenpüree, Wasser, Salz, Olivenöl, Gewürze. Mozzarella (ca. 18 %): laktosefreier schnittfester Mozzarella aus Kuhmilch. Peperoni-Salami (ca. 9 %): Schweinefleisch, Schweinespeck, Gewürze, Nitritpökelsalz. Roter Cheddar (ca. 3 %). Kann Spuren von Ei, Fisch, Soja, Sellerie, Lupine und Senf enthalten.",
      naehrwerte: {
        kcal: "ca. 1074-1097 kcal",
        protein: "ca. 47-51 g",
        fat: "ca. 41-51 g",
        carbs: "ca. 112-121 g",
        ballaststoffe: "ca. 8,8 g",
        salz: "ca. 7 g",
      },
      quelle: "placeholder",
    },
    "ESN Designer Whey - Salted Dark Chocolate": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1633 kJ / 100 g",
        kcal: "387 kcal / 100 g",
        protein: "72 g / 100 g",
        fat: "7,1 g / 100 g",
        saturatedFat: "4,0 g / 100 g",
        carbs: "8,0 g / 100 g",
        sugar: "5,5 g / 100 g",
        ballaststoffe: "2,3 g / 100 g",
        salz: "1,8 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,7 g" },
        { name: "Arginin", amount: "2,3 g" },
        { name: "Asparaginsäure", amount: "10 g" },
        { name: "Cystein", amount: "2,2 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,7 g" },
        { name: "Isoleucin", amount: "5,9 g" },
        { name: "Leucin", amount: "10 g" },
        { name: "Lysin", amount: "8,9 g" },
        { name: "Methionin", amount: "2,0 g" },
        { name: "Phenylalanin", amount: "3,0 g" },
        { name: "Prolin", amount: "5,6 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "6,6 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "2,8 g" },
        { name: "Valin", amount: "5,3 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Honey Cereal": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1564 kJ / 100 g",
        kcal: "369 kcal / 100 g",
        protein: "76 g / 100 g",
        fat: "4,4 g / 100 g",
        saturatedFat: "2,6 g / 100 g",
        carbs: "7,2 g / 100 g",
        sugar: "4,6 g / 100 g",
        ballaststoffe: "0 g / 100 g",
        salz: "0,68 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,7 g" },
        { name: "Arginin", amount: "2,3 g" },
        { name: "Asparaginsäure", amount: "10 g" },
        { name: "Cystein", amount: "2,2 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,7 g" },
        { name: "Isoleucin", amount: "5,9 g" },
        { name: "Leucin", amount: "10 g" },
        { name: "Lysin", amount: "8,9 g" },
        { name: "Methionin", amount: "2,0 g" },
        { name: "Phenylalanin", amount: "3,0 g" },
        { name: "Prolin", amount: "5,6 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "6,6 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "2,8 g" },
        { name: "Valin", amount: "5,3 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - White Chocolate Pistachio": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1616 kJ / 100 g",
        kcal: "382 kcal / 100 g",
        protein: "77 g / 100 g",
        fat: "5,3 g / 100 g",
        saturatedFat: "2,9 g / 100 g",
        carbs: "8,0 g / 100 g",
        sugar: "6,8 g / 100 g",
        ballaststoffe: "0 g / 100 g",
        salz: "1,0 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,7 g" },
        { name: "Arginin", amount: "2,3 g" },
        { name: "Asparaginsäure", amount: "10 g" },
        { name: "Cystein", amount: "2,2 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,7 g" },
        { name: "Isoleucin", amount: "5,9 g" },
        { name: "Leucin", amount: "10 g" },
        { name: "Lysin", amount: "8,9 g" },
        { name: "Methionin", amount: "2,0 g" },
        { name: "Phenylalanin", amount: "3,0 g" },
        { name: "Prolin", amount: "5,6 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "6,6 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "2,8 g" },
        { name: "Valin", amount: "5,3 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Vanilla Milk": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1756 kJ / 100 g",
        kcal: "418 kcal / 100 g",
        protein: "75 g / 100 g",
        fat: "6,2 g / 100 g",
        saturatedFat: "4,1 g / 100 g",
        carbs: "7,3 g / 100 g",
        sugar: "5,0 g / 100 g",
        ballaststoffe: "0 g / 100 g",
        salz: "0,73 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Vanilla Ice Cream": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1613 kJ / 100 g",
        kcal: "381 kcal / 100 g",
        protein: "78 g / 100 g",
        fat: "4,7 g / 100 g",
        saturatedFat: "2,6 g / 100 g",
        carbs: "7,6 g / 100 g",
        sugar: "5,3 g / 100 g",
        ballaststoffe: "0 g / 100 g",
        salz: "0,60 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,7 g" },
        { name: "Arginin", amount: "2,3 g" },
        { name: "Asparaginsäure", amount: "10 g" },
        { name: "Cystein", amount: "2,2 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,7 g" },
        { name: "Isoleucin", amount: "5,9 g" },
        { name: "Leucin", amount: "10 g" },
        { name: "Lysin", amount: "8,9 g" },
        { name: "Methionin", amount: "2,0 g" },
        { name: "Phenylalanin", amount: "3,0 g" },
        { name: "Prolin", amount: "5,6 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "6,6 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "2,8 g" },
        { name: "Valin", amount: "5,3 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Strawberry Cream": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1635 kJ / 100 g",
        kcal: "387 kcal / 100 g",
        protein: "81 g / 100 g",
        fat: "5,6 g / 100 g",
        saturatedFat: "3,1 g / 100 g",
        carbs: "4,3 g / 100 g",
        sugar: "3,5 g / 100 g",
        ballaststoffe: "<0,5 g / 100 g",
        salz: "0,63 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Stracciatella": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1607 kJ / 100 g",
        kcal: "380 kcal / 100 g",
        protein: "73 g / 100 g",
        fat: "5,3 g / 100 g",
        saturatedFat: "3,0 g / 100 g",
        carbs: "7,5 g / 100 g",
        sugar: "6,4 g / 100 g",
        ballaststoffe: "<0,5 g / 100 g",
        salz: "1,1 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Neutral": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1588 kJ / 100 g",
        kcal: "375 kcal / 100 g",
        protein: "82 g / 100 g",
        fat: "3,8 g / 100 g",
        saturatedFat: "1,9 g / 100 g",
        carbs: "4,4 g / 100 g",
        sugar: "4,3 g / 100 g",
        ballaststoffe: "< 0,5 g / 100 g",
        salz: "0,66 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Milky Hazelnut": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1584 kJ / 100 g",
        kcal: "374 kcal / 100 g",
        protein: "74 g / 100 g",
        fat: "4,8 g / 100 g",
        saturatedFat: "2,5 g / 100 g",
        carbs: "6,6 g / 100 g",
        sugar: "5,1 g / 100 g",
        ballaststoffe: "0,8 g / 100 g",
        salz: "0,80 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Milk Chocolate": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1584 kJ / 100 g",
        kcal: "374 kcal / 100 g",
        protein: "72 g / 100 g",
        fat: "5,3 g / 100 g",
        saturatedFat: "2,8 g / 100 g",
        carbs: "5,9 g / 100 g",
        sugar: "5,2 g / 100 g",
        ballaststoffe: "1,6 g / 100 g",
        salz: "1,1 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Leons Cereal": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1573 kJ / 100 g",
        kcal: "371 kcal / 100 g",
        protein: "69 g / 100 g",
        fat: "4,6 g / 100 g",
        saturatedFat: "2,4 g / 100 g",
        carbs: "11 g / 100 g",
        sugar: "6,1 g / 100 g",
        ballaststoffe: "1,0 g / 100 g",
        salz: "1,6 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,8 g" },
        { name: "Arginin", amount: "1,9 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "18 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,6 g" },
        { name: "Isoleucin", amount: "6,2 g" },
        { name: "Leucin", amount: "9,6 g" },
        { name: "Lysin", amount: "9,1 g" },
        { name: "Methionin", amount: "1,9 g" },
        { name: "Phenylalanin", amount: "2,9 g" },
        { name: "Prolin", amount: "5,8 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "2,0 g" },
        { name: "Tyrosin", amount: "3,1 g" },
        { name: "Valin", amount: "5,2 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Dark Cookies & Cream": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1577 kJ / 100 g",
        kcal: "373 kcal / 100 g",
        protein: "72 g / 100 g",
        fat: "5,4 g / 100 g",
        saturatedFat: "2,8 g / 100 g",
        carbs: "9,6 g / 100 g",
        sugar: "5,6 g / 100 g",
        ballaststoffe: "2,3 g / 100 g",
        salz: "1,1 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Cinnamon Cereal": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1630 kJ / 100 g",
        kcal: "386 kcal / 100 g",
        protein: "76 g / 100 g",
        fat: "6,1 g / 100 g",
        saturatedFat: "3,4 g / 100 g",
        carbs: "7,7 g / 100 g",
        sugar: "4,6 g / 100 g",
        ballaststoffe: "< 0,5 g / 100 g",
        salz: "1,0 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Cherry Yogurt": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1544 kJ / 100 g",
        kcal: "372 kcal / 100 g",
        protein: "71 g / 100 g",
        fat: "4,5 g / 100 g",
        saturatedFat: "2,4 g / 100 g",
        carbs: "8,9 g / 100 g",
        sugar: "6,7 g / 100 g",
        ballaststoffe: "0 g / 100 g",
        salz: "1,4 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Banana Milk": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1589 kJ / 100 g",
        kcal: "375 kcal / 100 g",
        protein: "75 g / 100 g",
        fat: "4,8 g / 100 g",
        saturatedFat: "2,6 g / 100 g",
        carbs: "6,1 g / 100 g",
        sugar: "5,3 g / 100 g",
        ballaststoffe: "0 g / 100 g",
        salz: "1,2 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Almond Coconut": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1611 kJ / 100 g",
        kcal: "381 kcal / 100 g",
        protein: "73 g / 100 g",
        fat: "5,6 g / 100 g",
        saturatedFat: "3,4 g / 100 g",
        carbs: "7,0 g / 100 g",
        sugar: "5,6 g / 100 g",
        salz: "1,1 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,6 g" },
        { name: "Arginin", amount: "2,0 g" },
        { name: "Asparaginsäure", amount: "11 g" },
        { name: "Cystein", amount: "2,7 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,2 g" },
        { name: "Histidin", amount: "1,5 g" },
        { name: "Isoleucin", amount: "6,1 g" },
        { name: "Leucin", amount: "11 g" },
        { name: "Lysin", amount: "9,4 g" },
        { name: "Methionin", amount: "1,8 g" },
        { name: "Phenylalanin", amount: "3,1 g" },
        { name: "Prolin", amount: "5,0 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "7,8 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "3,2 g" },
        { name: "Valin", amount: "6,0 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Germknödel": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1590 kJ / 100 g",
        kcal: "376 kcal / 100 g",
        protein: "77 g / 100 g",
        fat: "5,4 g / 100 g",
        saturatedFat: "2,5 g / 100 g",
        carbs: "7,1 g / 100 g",
        sugar: "5,6 g / 100 g",
        ballaststoffe: "0,6 g / 100 g",
        salz: "1,3 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,7 g" },
        { name: "Arginin", amount: "2,3 g" },
        { name: "Asparaginsäure", amount: "10 g" },
        { name: "Cystein", amount: "2,2 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,7 g" },
        { name: "Isoleucin", amount: "5,9 g" },
        { name: "Leucin", amount: "10 g" },
        { name: "Lysin", amount: "8,9 g" },
        { name: "Methionin", amount: "2,0 g" },
        { name: "Phenylalanin", amount: "3,0 g" },
        { name: "Prolin", amount: "5,6 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "6,6 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "2,8 g" },
        { name: "Valin", amount: "5,3 g" },
      ],
      quelle: "placeholder",
    },
    "ESN Designer Whey - Peanutbutter Cup": {
      marke: "ESN",
      gewicht: "908 g (30 Portionen)",
      preis: "€43,94/kg",
      kategorie: "Proteinpulver",
      zutaten: "Keine Zutatenangaben hinterlegt.",
      naehrwerte: {
        energyKj: "1608 kJ / 100 g",
        kcal: "380 kcal / 100 g",
        protein: "74 g / 100 g",
        fat: "4,7 g / 100 g",
        saturatedFat: "2,4 g / 100 g",
        carbs: "9,1 g / 100 g",
        sugar: "4,3 g / 100 g",
        ballaststoffe: "1,6 g / 100 g",
        salz: "1,5 g / 100 g",
      },
      aminosaeurenprofil: [
        { name: "Alanin", amount: "4,7 g" },
        { name: "Arginin", amount: "2,3 g" },
        { name: "Asparaginsäure", amount: "10 g" },
        { name: "Cystein", amount: "2,2 g" },
        { name: "Glutaminsäure", amount: "17 g" },
        { name: "Glycin", amount: "1,7 g" },
        { name: "Histidin", amount: "1,7 g" },
        { name: "Isoleucin", amount: "5,9 g" },
        { name: "Leucin", amount: "10 g" },
        { name: "Lysin", amount: "8,9 g" },
        { name: "Methionin", amount: "2,0 g" },
        { name: "Phenylalanin", amount: "3,0 g" },
        { name: "Prolin", amount: "5,6 g" },
        { name: "Serin", amount: "4,7 g" },
        { name: "Threonin", amount: "6,6 g" },
        { name: "Tryptophan", amount: "1,7 g" },
        { name: "Tyrosin", amount: "2,8 g" },
        { name: "Valin", amount: "5,3 g" },
      ],
      quelle: "placeholder",
    }
  };

  return manualDetailsByName[product.name] ?? null;
}

async function loadRatingSummary(routeSlug: string, currentUserId: string | null) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      durchschnittsbewertung: PLACEHOLDER_NUMBER,
      kommentare: [],
    };
  }

  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .select("user_id, rating, comment, updated_at")
    .eq("product_slug", routeSlug)
    .order("updated_at", { ascending: false });

  if (error || !Array.isArray(data)) {
    return {
      durchschnittsbewertung: PLACEHOLDER_NUMBER,
      kommentare: [],
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

  const commentRows = rows.filter(
    (row) => typeof row.comment === "string" && row.comment.trim().length > 0
  );

  if (commentRows.length === 0) {
    return {
      durchschnittsbewertung: average,
      kommentare: [],
    };
  }

  const userIds = Array.from(new Set(commentRows.map((row) => row.user_id).filter(Boolean)));
  const usernameByUserId = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from(USER_PROFILES_TABLE)
      .select("user_id, username")
      .in("user_id", userIds);

    if (!profileError && Array.isArray(profileData)) {
      for (const profile of profileData as ProfileRow[]) {
        const normalizedUsername =
          typeof profile.username === "string" ? profile.username.trim() : "";

        if (normalizedUsername) {
          usernameByUserId.set(profile.user_id, normalizedUsername);
        }
      }
    }
  }

  const comments: ProductComment[] = commentRows
    .map((row) => {
      const text = typeof row.comment === "string" ? row.comment.trim() : "";
      if (!text) {
        return null;
      }

      return {
        username: usernameByUserId.get(row.user_id) ?? FALLBACK_USERNAME,
        text,
        updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
        isOwnComment: currentUserId !== null && row.user_id === currentUserId,
      };
    })
    .filter((entry): entry is ProductComment => entry !== null);

  comments.sort((left, right) => Number(right.isOwnComment) - Number(left.isOwnComment));

  return {
    durchschnittsbewertung: average,
    kommentare: comments,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.email ? getStableUserId(session.user.email) : null;

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "ungueltiger slug" }, { status: 400 });
  }

  const product = ALL_PRODUCTS.find((item) => getProductRouteSlug(item) === slug);

  if (!product) {
    return NextResponse.json({ error: "produkt nicht gefunden" }, { status: 404 });
  }

  const base = getDefaultDetails(product);
  const manualDetails = getManualDetails(product);

  const [onlineMatch, ratingSummary] = await Promise.all([
    manualDetails ? Promise.resolve(null) : findOpenFoodFactsMatch(product),
    loadRatingSummary(slug, currentUserId),
  ]);

  let merged = onlineMatch ? mergeOnlineDetails(base, onlineMatch) : base;
  if (manualDetails) {
    merged = mergeDetails(merged, manualDetails);
  }

  const payload = {
    ...merged,
    durchschnittsbewertung: ratingSummary.durchschnittsbewertung,
    kommentare: ratingSummary.kommentare,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
