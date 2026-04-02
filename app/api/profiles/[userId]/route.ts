import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  applyProductBaseToCustomLists,
  buildCustomLists,
  isCustomListSchemaMissingError,
  type CustomListItemRow,
  type CustomListRow,
} from "@/lib/custom-lists";
import { resolveProductSummariesByRouteSlug } from "@/lib/imported-products";
import {
  getSupabaseAdminClient,
  RATINGS_TABLE,
  USER_CUSTOM_LIST_ITEMS_TABLE,
  USER_CUSTOM_LISTS_TABLE,
  USER_FOLLOWS_TABLE,
  USER_PROFILES_TABLE,
  USER_PRODUCT_LISTS_TABLE,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BASIC_PROFILE_SELECT = "user_id, username";
const EXTENDED_PROFILE_SELECT = "user_id, username, bio, avatar_url";

type ProfileRow = {
  user_id: string;
  username: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

type RatingRow = {
  product_slug: string;
  rating: number | null;
  comment: string | null;
  updated_at: string | null;
};

type ProductListRow = {
  product_slug: string;
  list_type: "favorites" | "want_to_try";
  inserted_at: string | null;
};

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function isMissingProfileFieldError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && (normalized.includes("bio") || normalized.includes("avatar_url"));
}

async function loadPublicProfileRow(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string
) {
  const extendedResult = await supabase
    .from(USER_PROFILES_TABLE)
    .select(EXTENDED_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (!extendedResult.error) {
    return {
      row: (extendedResult.data as ProfileRow | null) ?? null,
      error: null,
    };
  }

  if (!isMissingProfileFieldError(extendedResult.error.message)) {
    return {
      row: null,
      error: extendedResult.error,
    };
  }

  const basicResult = await supabase
    .from(USER_PROFILES_TABLE)
    .select(BASIC_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    row: (basicResult.data as ProfileRow | null) ?? null,
    error: basicResult.error,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;

  if (!isUuid(userId)) {
    return NextResponse.json(
      { success: false, error: "Ungültige User-ID" },
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

  const session = await getServerSession(authOptions);
  const viewerUserId = session?.user?.email
    ? getStableUserId(session.user.email)
    : null;

  const { row: profile, error: profileError } = await loadPublicProfileRow(supabase, userId);

  if (profileError) {
    return NextResponse.json(
      { success: false, error: profileError.message },
      { status: 400 }
    );
  }

  const username = typeof profile?.username === "string" ? profile.username.trim() : "";

  if (!profile || username.length === 0) {
    return NextResponse.json(
      { success: false, error: "Profil nicht gefunden" },
      { status: 404 }
    );
  }

  const bio = typeof profile.bio === "string" ? profile.bio.trim() || null : null;
  const avatarUrl =
    typeof profile.avatar_url === "string" && profile.avatar_url.trim().length > 0
      ? profile.avatar_url.trim()
      : null;

  const [ratingsResult, listsResult, followersResult, followingResult, customListsResult] =
    await Promise.all([
      supabase
        .from(RATINGS_TABLE)
        .select("product_slug, rating, comment, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from(USER_PRODUCT_LISTS_TABLE)
        .select("product_slug, list_type, inserted_at")
        .eq("user_id", userId)
        .order("inserted_at", { ascending: false }),
      supabase
        .from(USER_FOLLOWS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("following_user_id", userId),
      supabase
        .from(USER_FOLLOWS_TABLE)
        .select("id", { count: "exact", head: true })
        .eq("follower_user_id", userId),
      supabase
        .from(USER_CUSTOM_LISTS_TABLE)
        .select("id, user_id, name, inserted_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
    ]);

  if (ratingsResult.error) {
    return NextResponse.json(
      { success: false, error: ratingsResult.error.message },
      { status: 400 }
    );
  }

  if (listsResult.error) {
    return NextResponse.json(
      { success: false, error: listsResult.error.message },
      { status: 400 }
    );
  }

  if (
    customListsResult.error &&
    !isCustomListSchemaMissingError(customListsResult.error.message)
  ) {
    return NextResponse.json(
      { success: false, error: customListsResult.error.message },
      { status: 400 }
    );
  }

  const ratingsRows = (ratingsResult.data ?? []) as RatingRow[];
  const listRows = (listsResult.data ?? []) as ProductListRow[];
  const customListRows = (customListsResult.data ?? []) as CustomListRow[];
  let customListItemRows = [] as CustomListItemRow[];

  if (customListRows.length > 0) {
    const customListItemsResult = await supabase
      .from(USER_CUSTOM_LIST_ITEMS_TABLE)
      .select("list_id, product_slug, inserted_at, updated_at")
      .in(
        "list_id",
        customListRows.map((row) => row.id)
      )
      .order("updated_at", { ascending: false });

    if (
      customListItemsResult.error &&
      !isCustomListSchemaMissingError(customListItemsResult.error.message)
    ) {
      return NextResponse.json(
        { success: false, error: customListItemsResult.error.message },
        { status: 400 }
      );
    }

    customListItemRows = (customListItemsResult.data ?? []) as CustomListItemRow[];
  }

  const resolvedProducts = await resolveProductSummariesByRouteSlug(
    [
      ...ratingsRows.map((row) => row.product_slug),
      ...listRows.map((row) => row.product_slug),
      ...customListItemRows.map((row) => row.product_slug),
    ].filter((slug): slug is string => typeof slug === "string" && slug.trim().length > 0)
  );

  function mapProductBase(slug: string) {
    const product = resolvedProducts.get(slug);

    return {
      productSlug: slug,
      name: product?.name ?? slug,
      category: product?.category ?? "Unbekannt",
    };
  }

  const ratings = ratingsRows
    .map((row) => {
      const comment = typeof row.comment === "string" ? row.comment.trim() : "";
      const rating = typeof row.rating === "number" ? row.rating : 0;

      if (rating <= 0 && comment.length === 0) {
        return null;
      }

      return {
        ...mapProductBase(row.product_slug),
        rating,
        comment,
        updatedAt: row.updated_at,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const favorites: Array<{
    productSlug: string;
    name: string;
    category: string;
    insertedAt: string | null;
  }> = [];

  const wantToTry: Array<{
    productSlug: string;
    name: string;
    category: string;
    insertedAt: string | null;
  }> = [];

  const favoritesSeen = new Set<string>();
  const wantToTrySeen = new Set<string>();

  for (const row of listRows) {
    if (row.list_type === "favorites") {
      if (favoritesSeen.has(row.product_slug)) continue;
      favoritesSeen.add(row.product_slug);

      favorites.push({
        ...mapProductBase(row.product_slug),
        insertedAt: row.inserted_at,
      });
      continue;
    }

    if (row.list_type === "want_to_try") {
      if (wantToTrySeen.has(row.product_slug)) continue;
      wantToTrySeen.add(row.product_slug);

      wantToTry.push({
        ...mapProductBase(row.product_slug),
        insertedAt: row.inserted_at,
      });
    }
  }

  let customLists = [] as ReturnType<typeof buildCustomLists>;

  if (customListRows.length > 0) {
    customLists = applyProductBaseToCustomLists(
      buildCustomLists(customListRows, customListItemRows, {
        previewLimit: Number.MAX_SAFE_INTEGER,
      }),
      resolvedProducts
    );
  }

  let isFollowing = false;

  if (viewerUserId && viewerUserId !== userId) {
    const followResult = await supabase
      .from(USER_FOLLOWS_TABLE)
      .select("id")
      .eq("follower_user_id", viewerUserId)
      .eq("following_user_id", userId)
      .maybeSingle();

    if (!followResult.error && followResult.data) {
      isFollowing = true;
    }
  }

  const followersCount = followersResult.count ?? 0;
  const followingCount = followingResult.count ?? 0;

  return NextResponse.json({
    success: true,
    data: {
      profile: {
        userId,
        username,
        bio,
        avatarUrl,
        followersCount,
        followingCount,
        isFollowing,
        isOwnProfile: viewerUserId === userId,
      },
      ratings,
      favorites,
      wantToTry,
      customLists,
    },
  });
}

