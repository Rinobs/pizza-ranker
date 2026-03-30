import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  ALL_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
} from "@/app/data/products";
import {
  RATINGS_TABLE,
  USER_FOLLOWS_TABLE,
  USER_PRODUCT_LISTS_TABLE,
  USER_PROFILES_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const BASIC_PROFILE_SELECT = "user_id, username";
const EXTENDED_PROFILE_SELECT = "user_id, username, avatar_url";
const FOLLOWING_PREVIEW_LIMIT = 6;
const FEED_LIMIT = 14;
const RATING_FETCH_LIMIT = 60;
const LIST_FETCH_LIMIT = 40;

type FollowRow = {
  following_user_id: string | null;
  inserted_at: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
  avatar_url?: string | null;
};

type RatingRow = {
  user_id: string;
  product_slug: string | null;
  rating: number | null;
  comment: string | null;
  updated_at: string | null;
};

type ProductListRow = {
  user_id: string;
  product_slug: string | null;
  list_type: "favorites" | "want_to_try" | null;
  updated_at: string | null;
};

type ProfileSummary = {
  username: string;
  avatarUrl: string | null;
};

type FeedActivity = {
  id: string;
  kind: "rating" | "review" | "favorite" | "want_to_try";
  userId: string;
  username: string;
  avatarUrl: string | null;
  product: {
    routeSlug: string;
    name: string;
    category: string;
    imageUrl: string;
  };
  rating: number | null;
  comment: string | null;
  createdAt: string | null;
};

const productByRouteSlug = new Map(
  ALL_PRODUCTS.map((product) => [getProductRouteSlug(product), product] as const)
);

function isMissingAvatarFieldError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && normalized.includes("avatar_url");
}

async function loadProfiles(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userIds: string[]
) {
  const extendedResult = await supabase
    .from(USER_PROFILES_TABLE)
    .select(EXTENDED_PROFILE_SELECT)
    .in("user_id", userIds);

  if (!extendedResult.error) {
    return {
      rows: (extendedResult.data ?? []) as ProfileRow[],
      error: null,
    };
  }

  if (!isMissingAvatarFieldError(extendedResult.error.message)) {
    return {
      rows: [] as ProfileRow[],
      error: extendedResult.error,
    };
  }

  const basicResult = await supabase
    .from(USER_PROFILES_TABLE)
    .select(BASIC_PROFILE_SELECT)
    .in("user_id", userIds);

  return {
    rows: (basicResult.data ?? []) as ProfileRow[],
    error: basicResult.error,
  };
}

function buildProfileByUserId(rows: ProfileRow[]) {
  const map = new Map<string, ProfileSummary>();

  for (const row of rows) {
    const username = typeof row.username === "string" ? row.username.trim() : "";
    const avatarUrl =
      typeof row.avatar_url === "string" && row.avatar_url.trim().length > 0
        ? row.avatar_url.trim()
        : null;

    map.set(row.user_id, {
      username: username || "Food Friend",
      avatarUrl,
    });
  }

  return map;
}

function mapProductBase(slug: string) {
  const product = productByRouteSlug.get(slug);

  return {
    routeSlug: slug,
    name: product?.name ?? slug,
    category: product?.category ?? "Unbekannt",
    imageUrl: getProductImageUrl(product ?? { imageUrl: null }),
  };
}

function getTimestampValue(value: string | null) {
  if (!value) return 0;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildFeedActivity(
  profile: ProfileSummary | undefined,
  input: Omit<FeedActivity, "username" | "avatarUrl">
): FeedActivity {
  return {
    ...input,
    username: profile?.username ?? "Food Friend",
    avatarUrl: profile?.avatarUrl ?? null,
  };
}

function emptyFeedData(viewerAuthenticated: boolean) {
  return {
    viewerAuthenticated,
    followingCount: 0,
    followingPreview: [] as Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      followedAt: string | null;
    }>,
    activities: [] as FeedActivity[],
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json({
      success: true,
      data: emptyFeedData(false),
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({
      success: true,
      data: emptyFeedData(true),
    });
  }

  const viewerUserId = getStableUserId(userEmail);
  const followingResult = await supabase
    .from(USER_FOLLOWS_TABLE)
    .select("following_user_id, inserted_at")
    .eq("follower_user_id", viewerUserId)
    .order("inserted_at", { ascending: false });

  if (followingResult.error) {
    return NextResponse.json(
      { success: false, error: followingResult.error.message },
      { status: 400 }
    );
  }

  const followingRows = ((followingResult.data ?? []) as FollowRow[]).filter(
    (row): row is FollowRow & { following_user_id: string } =>
      typeof row.following_user_id === "string" && row.following_user_id.length > 0
  );

  if (followingRows.length === 0) {
    return NextResponse.json({
      success: true,
      data: emptyFeedData(true),
    });
  }

  const followedUserIds = Array.from(
    new Set(followingRows.map((row) => row.following_user_id))
  );

  const [profilesResult, ratingsResult, productListsResult] = await Promise.all([
    loadProfiles(supabase, followedUserIds),
    supabase
      .from(RATINGS_TABLE)
      .select("user_id, product_slug, rating, comment, updated_at")
      .in("user_id", followedUserIds)
      .order("updated_at", { ascending: false })
      .limit(RATING_FETCH_LIMIT),
    supabase
      .from(USER_PRODUCT_LISTS_TABLE)
      .select("user_id, product_slug, list_type, updated_at")
      .in("user_id", followedUserIds)
      .order("updated_at", { ascending: false })
      .limit(LIST_FETCH_LIMIT),
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

  if (productListsResult.error) {
    return NextResponse.json(
      { success: false, error: productListsResult.error.message },
      { status: 400 }
    );
  }

  const profileByUserId = buildProfileByUserId(profilesResult.rows);

  const followingPreview = followingRows.slice(0, FOLLOWING_PREVIEW_LIMIT).map((row) => {
    const profile = profileByUserId.get(row.following_user_id);

    return {
      userId: row.following_user_id,
      username: profile?.username ?? "Food Friend",
      avatarUrl: profile?.avatarUrl ?? null,
      followedAt: row.inserted_at,
    };
  });

  const ratingActivities = ((ratingsResult.data ?? []) as RatingRow[])
    .map((row) => {
      if (!row.product_slug) return null;

      const comment = typeof row.comment === "string" ? row.comment.trim() : "";
      const rating =
        typeof row.rating === "number" && row.rating > 0 ? row.rating : null;

      if (rating === null && comment.length === 0) {
        return null;
      }

      return buildFeedActivity(profileByUserId.get(row.user_id), {
        id: `rating-${row.user_id}-${row.product_slug}-${row.updated_at ?? "unknown"}`,
        kind: comment.length > 0 ? "review" : "rating",
        userId: row.user_id,
        product: mapProductBase(row.product_slug),
        rating,
        comment: comment || null,
        createdAt: row.updated_at,
      });
    })
    .filter((activity): activity is FeedActivity => activity !== null);

  const listActivities = ((productListsResult.data ?? []) as ProductListRow[])
    .map((row) => {
      if (!row.product_slug) return null;
      if (row.list_type !== "favorites" && row.list_type !== "want_to_try") {
        return null;
      }

      return buildFeedActivity(profileByUserId.get(row.user_id), {
        id: `list-${row.list_type}-${row.user_id}-${row.product_slug}-${row.updated_at ?? "unknown"}`,
        kind: row.list_type === "favorites" ? "favorite" : "want_to_try",
        userId: row.user_id,
        product: mapProductBase(row.product_slug),
        rating: null,
        comment: null,
        createdAt: row.updated_at,
      });
    })
    .filter((activity): activity is FeedActivity => activity !== null);

  const activities = [...ratingActivities, ...listActivities]
    .sort(
      (left, right) =>
        getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt)
    )
    .slice(0, FEED_LIMIT);

  return NextResponse.json({
    success: true,
    data: {
      viewerAuthenticated: true,
      followingCount: followedUserIds.length,
      followingPreview,
      activities,
      generatedAt: new Date().toISOString(),
    },
  });
}
