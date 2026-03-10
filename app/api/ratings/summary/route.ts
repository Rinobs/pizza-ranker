import { NextResponse } from "next/server";
import { getSupabaseAdminClient, RATINGS_TABLE } from "@/lib/supabase";

type RatingRow = {
  product_slug: string | null;
  rating: number | null;
};

type RatingStats = {
  sum: number;
  count: number;
};

export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ success: true, stats: {} });
  }

  const { data, error } = await supabase.from(RATINGS_TABLE).select("product_slug, rating");

  if (error || !Array.isArray(data)) {
    return NextResponse.json({ success: true, stats: {} });
  }

  const aggregates = new Map<string, RatingStats>();

  for (const row of data as RatingRow[]) {
    if (!row.product_slug || typeof row.rating !== "number") {
      continue;
    }

    const current = aggregates.get(row.product_slug) ?? { sum: 0, count: 0 };
    current.sum += row.rating;
    current.count += 1;
    aggregates.set(row.product_slug, current);
  }

  const stats: Record<string, { ratingAvg: number | null; ratingCount: number }> = {};

  for (const [slug, aggregate] of aggregates.entries()) {
    stats[slug] = {
      ratingAvg: aggregate.count > 0 ? aggregate.sum / aggregate.count : null,
      ratingCount: aggregate.count,
    };
  }

  return NextResponse.json({ success: true, stats });
}

