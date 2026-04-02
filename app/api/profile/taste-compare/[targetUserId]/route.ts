import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  RATINGS_TABLE,
  USER_PRODUCT_LISTS_TABLE,
  USER_PROFILES_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { resolveProductSummariesByRouteSlug } from "@/lib/imported-products";
import { buildTasteComparison } from "@/lib/profile-gamification";
import { getStableUserId } from "@/lib/user-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProfileRow = {
  user_id: string;
  username: string | null;
};

type RatingRow = {
  user_id: string;
  product_slug: string | null;
  rating: number | null;
};

type ProductListRow = {
  user_id: string;
  product_slug: string | null;
  list_type: "favorites" | "want_to_try" | "tried" | null;
};

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ targetUserId: string }> }
) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { targetUserId } = await context.params;
  if (!isUuid(targetUserId)) {
    return NextResponse.json(
      { success: false, error: "Ungültige User-ID" },
      { status: 400 }
    );
  }

  const viewerUserId = getStableUserId(userEmail);
  if (viewerUserId === targetUserId) {
    return NextResponse.json(
      { success: false, error: "Vergleich mit dir selbst ist hier nicht nötig." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const comparedUserIds = [viewerUserId, targetUserId];

  const [profilesResult, ratingsResult, favoritesResult] = await Promise.all([
    supabase
      .from(USER_PROFILES_TABLE)
      .select("user_id, username")
      .in("user_id", comparedUserIds),
    supabase
      .from(RATINGS_TABLE)
      .select("user_id, product_slug, rating")
      .in("user_id", comparedUserIds),
    supabase
      .from(USER_PRODUCT_LISTS_TABLE)
      .select("user_id, product_slug, list_type")
      .in("user_id", comparedUserIds)
      .eq("list_type", "favorites"),
  ]);

  if (profilesResult.error) {
    return NextResponse.json(
      { success: false, error: profilesResult.error.message },
      { status: 400 }
    );
  }

  if (ratingsResult.error) {
    return NextResponse.json(
      { success: false, error: ratingsResult.error.message },
      { status: 400 }
    );
  }

  if (favoritesResult.error) {
    return NextResponse.json(
      { success: false, error: favoritesResult.error.message },
      { status: 400 }
    );
  }

  const usernameByUserId = new Map<string, string>();
  for (const row of (profilesResult.data ?? []) as ProfileRow[]) {
    const username = typeof row.username === "string" ? row.username.trim() : "";
    if (username.length > 0) {
      usernameByUserId.set(row.user_id, username);
    }
  }

  const targetUsername = usernameByUserId.get(targetUserId);
  if (!targetUsername) {
    return NextResponse.json(
      { success: false, error: "Profil nicht gefunden" },
      { status: 404 }
    );
  }

  const viewerUsername = usernameByUserId.get(viewerUserId) ?? "Du";

  const viewerRatings = new Map<string, number>();
  const targetRatings = new Map<string, number>();

  for (const row of (ratingsResult.data ?? []) as RatingRow[]) {
    if (!row.product_slug || typeof row.rating !== "number" || row.rating <= 0) {
      continue;
    }

    if (row.user_id === viewerUserId) {
      viewerRatings.set(row.product_slug, row.rating);
      continue;
    }

    if (row.user_id === targetUserId) {
      targetRatings.set(row.product_slug, row.rating);
    }
  }

  const viewerFavorites = new Set<string>();
  const targetFavorites = new Set<string>();

  for (const row of (favoritesResult.data ?? []) as ProductListRow[]) {
    if (row.list_type !== "favorites" || !row.product_slug) {
      continue;
    }

    if (row.user_id === viewerUserId) {
      viewerFavorites.add(row.product_slug);
      continue;
    }

    if (row.user_id === targetUserId) {
      targetFavorites.add(row.product_slug);
    }
  }

  const sharedFavoriteSlugs = Array.from(viewerFavorites).filter((slug) =>
    targetFavorites.has(slug)
  );
  const comparison = buildTasteComparison(viewerRatings, targetRatings);
  const resolvedProducts = await resolveProductSummariesByRouteSlug(
    [
      ...sharedFavoriteSlugs,
      ...(comparison?.overlaps.map((item) => item.productSlug) ?? []),
      ...(comparison?.strongestAgreements.map((item) => item.productSlug) ?? []),
      ...(comparison?.strongestDisagreements.map((item) => item.productSlug) ?? []),
    ]
  );

  function mapProductBase(slug: string) {
    const product = resolvedProducts.get(slug);

    return {
      productSlug: slug,
      name: product?.name ?? slug,
      category: product?.category ?? "Unbekannt",
      imageUrl: product?.imageUrl ?? "",
    };
  }

  return NextResponse.json({
    success: true,
    data: {
      viewer: {
        userId: viewerUserId,
        username: viewerUsername,
      },
      target: {
        userId: targetUserId,
        username: targetUsername,
      },
      comparison: comparison
        ? {
            matchScore: comparison.matchScore,
            overlapCount: comparison.overlapCount,
            averageDifference: Number(comparison.averageDifference.toFixed(2)),
            overlapProducts: [...comparison.overlaps]
              .sort((left, right) => {
                if (left.difference !== right.difference) {
                  return left.difference - right.difference;
                }

                if (left.averageRating !== right.averageRating) {
                  return right.averageRating - left.averageRating;
                }

                return left.productSlug.localeCompare(right.productSlug, "de");
              })
              .map((item) => ({
                ...mapProductBase(item.productSlug),
                viewerRating: item.viewerRating,
                targetRating: item.candidateRating,
                difference: Number(item.difference.toFixed(2)),
              })),
            strongestAgreements: comparison.strongestAgreements.map((item) => ({
              ...mapProductBase(item.productSlug),
              viewerRating: item.viewerRating,
              targetRating: item.candidateRating,
              difference: Number(item.difference.toFixed(2)),
            })),
            strongestDisagreements: comparison.strongestDisagreements.map((item) => ({
              ...mapProductBase(item.productSlug),
              viewerRating: item.viewerRating,
              targetRating: item.candidateRating,
              difference: Number(item.difference.toFixed(2)),
            })),
            sharedFavoritesCount: sharedFavoriteSlugs.length,
            sharedFavorites: sharedFavoriteSlugs.slice(0, 4).map((slug) => mapProductBase(slug)),
          }
        : null,
    },
  });
}
