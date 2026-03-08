import { NextResponse } from "next/server";
import {
  ALL_PRODUCTS,
  PIZZA_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
  type Product,
} from "@/app/data/products";
import { createClient } from "@supabase/supabase-js";

type RankedProduct = {
  name: string;
  category: string;
  routeSlug: string;
  imageUrl: string;
  ratingAvg: number | null;
  ratingCount: number;
  weekRatingAvg: number | null;
  weekRatingCount: number;
};

type RatingRow = {
  product_slug: string | null;
  rating: number | null;
  updated_at: string | null;
};

type Agg = {
  sum: number;
  count: number;
  weekSum: number;
  weekCount: number;
  weekEvents: number;
};

const LIMIT = 10;

function toRankedProduct(product: Product): RankedProduct {
  return {
    name: product.name,
    category: product.category,
    routeSlug: getProductRouteSlug(product),
    imageUrl: getProductImageUrl(product),
    ratingAvg: null,
    ratingCount: 0,
    weekRatingAvg: null,
    weekRatingCount: 0,
  };
}

function withStats(
  product: Product,
  aggregateMap: Map<string, Agg>
): RankedProduct {
  const base = toRankedProduct(product);
  const agg = aggregateMap.get(base.routeSlug);

  if (!agg || agg.count === 0) {
    return base;
  }

  return {
    ...base,
    ratingAvg: agg.sum / agg.count,
    ratingCount: agg.count,
    weekRatingAvg: agg.weekCount > 0 ? agg.weekSum / agg.weekCount : null,
    weekRatingCount: agg.weekCount,
  };
}

function aggregateRatings(rows: RatingRow[]): Map<string, Agg> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const map = new Map<string, Agg>();

  for (const row of rows) {
    if (!row.product_slug || typeof row.rating !== "number") continue;

    const current =
      map.get(row.product_slug) ||
      {
        sum: 0,
        count: 0,
        weekSum: 0,
        weekCount: 0,
        weekEvents: 0,
      };

    current.sum += row.rating;
    current.count += 1;

    const timestamp = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
    if (!Number.isNaN(timestamp) && timestamp >= weekAgo) {
      current.weekSum += row.rating;
      current.weekCount += 1;
      current.weekEvents += 1;
    }

    map.set(row.product_slug, current);
  }

  return map;
}

function byAllTimeScore(a: RankedProduct, b: RankedProduct): number {
  const aRated = a.ratingCount > 0 ? 1 : 0;
  const bRated = b.ratingCount > 0 ? 1 : 0;
  if (aRated !== bRated) return bRated - aRated;

  const aAvg = a.ratingAvg ?? 0;
  const bAvg = b.ratingAvg ?? 0;
  if (aAvg !== bAvg) return bAvg - aAvg;

  if (a.ratingCount !== b.ratingCount) return b.ratingCount - a.ratingCount;
  return a.name.localeCompare(b.name);
}

function byTrendingScore(a: RankedProduct, b: RankedProduct): number {
  if (a.weekRatingCount !== b.weekRatingCount) {
    return b.weekRatingCount - a.weekRatingCount;
  }

  const aWeekAvg = a.weekRatingAvg ?? 0;
  const bWeekAvg = b.weekRatingAvg ?? 0;
  if (aWeekAvg !== bWeekAvg) return bWeekAvg - aWeekAvg;

  return byAllTimeScore(a, b);
}

function fallbackSections() {
  const topPizza = PIZZA_PRODUCTS.slice(0, LIMIT).map(toRankedProduct);
  const newlyAdded = ALL_PRODUCTS.slice(-LIMIT).reverse().map(toRankedProduct);
  const trending = ALL_PRODUCTS.slice(0, LIMIT).map(toRankedProduct);
  const bestThisWeek = topPizza;

  return {
    topPizza,
    newlyAdded,
    trending,
    bestThisWeek,
    hasLiveRatings: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const fallback = fallbackSections();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json(fallback);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("ratings")
    .select("product_slug, rating, updated_at");

  if (error || !Array.isArray(data)) {
    return NextResponse.json(fallback);
  }

  const aggregateMap = aggregateRatings(data as RatingRow[]);

  const pizzaRanked = PIZZA_PRODUCTS.map((product) => withStats(product, aggregateMap));
  const allRanked = ALL_PRODUCTS.map((product) => withStats(product, aggregateMap));

  const topPizza = [...pizzaRanked].sort(byAllTimeScore).slice(0, LIMIT);

  const newlyAdded = ALL_PRODUCTS.slice(-LIMIT).reverse().map((product) =>
    withStats(product, aggregateMap)
  );

  const trendingCandidates = allRanked.filter((item) => item.weekRatingCount > 0);
  const trending =
    trendingCandidates.length > 0
      ? trendingCandidates.sort(byTrendingScore).slice(0, LIMIT)
      : [...allRanked].sort(byAllTimeScore).slice(0, LIMIT);

  const bestWeekCandidates = allRanked.filter((item) => item.weekRatingAvg !== null);
  const bestThisWeek =
    bestWeekCandidates.length > 0
      ? [...bestWeekCandidates]
          .sort((a, b) => {
            const aWeek = a.weekRatingAvg ?? 0;
            const bWeek = b.weekRatingAvg ?? 0;
            if (aWeek !== bWeek) return bWeek - aWeek;
            return byTrendingScore(a, b);
          })
          .slice(0, LIMIT)
      : [...allRanked].sort(byAllTimeScore).slice(0, LIMIT);

  return NextResponse.json({
    topPizza,
    newlyAdded,
    trending,
    bestThisWeek,
    hasLiveRatings: true,
    generatedAt: new Date().toISOString(),
  });
}

