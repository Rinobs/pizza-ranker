import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  RATINGS_TABLE,
  USER_FOLLOWS_TABLE,
  USER_PRODUCT_LISTS_TABLE,
  USER_PROFILES_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";
import {
  buildTasteMatch,
  calculateProfilePoints,
  getProfileLevelInfo,
} from "@/lib/profile-gamification";

type FollowRow = {
  following_user_id?: string | null;
  follower_user_id?: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
};

type RatingRow = {
  user_id: string;
  product_slug: string | null;
  rating: number | null;
  comment: string | null;
};

type ProductListRow = {
  user_id: string;
  product_slug: string | null;
  list_type: "favorites" | "want_to_try" | null;
};

type FollowerCountRow = {
  following_user_id: string | null;
};

type FriendAggregate = {
  userId: string;
  username: string;
  ratingCount: number;
  commentCount: number;
  favoriteCount: number;
  followerCount: number;
  points: number;
  currentLevelName: string;
  nextLevelName: string | null;
  pointsToNextLevel: number;
  ratingsByProduct: Map<string, number>;
};

function createAggregate(userId: string, username: string): FriendAggregate {
  return {
    userId,
    username,
    ratingCount: 0,
    commentCount: 0,
    favoriteCount: 0,
    followerCount: 0,
    points: 0,
    currentLevelName: "Snack Scout",
    nextLevelName: null,
    pointsToNextLevel: 0,
    ratingsByProduct: new Map<string, number>(),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  const viewerUserId = getStableUserId(userEmail);

  const [followingResult, followersResult] = await Promise.all([
    supabase
      .from(USER_FOLLOWS_TABLE)
      .select("following_user_id")
      .eq("follower_user_id", viewerUserId),
    supabase
      .from(USER_FOLLOWS_TABLE)
      .select("follower_user_id")
      .eq("following_user_id", viewerUserId),
  ]);

  if (followingResult.error) {
    return NextResponse.json(
      { success: false, error: followingResult.error.message },
      { status: 400 }
    );
  }

  if (followersResult.error) {
    return NextResponse.json(
      { success: false, error: followersResult.error.message },
      { status: 400 }
    );
  }

  const followingUserIds = Array.from(
    new Set(
      ((followingResult.data ?? []) as FollowRow[])
        .map((row) => row.following_user_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  const followerUserIds = new Set(
    ((followersResult.data ?? []) as FollowRow[])
      .map((row) => row.follower_user_id)
      .filter((value): value is string => typeof value === "string" && value.length > 0)
  );

  const mutualFriendIds = followingUserIds.filter((userId) => followerUserIds.has(userId));
  const comparedUserIds = mutualFriendIds.length > 0 ? mutualFriendIds : followingUserIds;
  const allUserIds = [viewerUserId, ...comparedUserIds];

  const [profilesResult, ratingsResult, favoritesResult, followerCountResult] = await Promise.all([
    supabase
      .from(USER_PROFILES_TABLE)
      .select("user_id, username")
      .in("user_id", allUserIds),
    supabase
      .from(RATINGS_TABLE)
      .select("user_id, product_slug, rating, comment")
      .in("user_id", allUserIds),
    supabase
      .from(USER_PRODUCT_LISTS_TABLE)
      .select("user_id, product_slug, list_type")
      .in("user_id", allUserIds),
    supabase
      .from(USER_FOLLOWS_TABLE)
      .select("following_user_id")
      .in("following_user_id", allUserIds),
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

  if (followerCountResult.error) {
    return NextResponse.json(
      { success: false, error: followerCountResult.error.message },
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

  const aggregates = new Map<string, FriendAggregate>();
  for (const userId of allUserIds) {
    const fallbackName = userId === viewerUserId ? "Du" : "Food Friend";
    aggregates.set(userId, createAggregate(userId, usernameByUserId.get(userId) ?? fallbackName));
  }

  for (const row of (ratingsResult.data ?? []) as RatingRow[]) {
    const aggregate = aggregates.get(row.user_id);
    if (!aggregate || !row.product_slug) {
      continue;
    }

    if (typeof row.rating === "number" && row.rating > 0) {
      aggregate.ratingCount += 1;
      aggregate.ratingsByProduct.set(row.product_slug, row.rating);
    }

    const comment = typeof row.comment === "string" ? row.comment.trim() : "";
    if (comment.length > 0) {
      aggregate.commentCount += 1;
    }
  }

  const favoriteSets = new Map<string, Set<string>>();
  for (const userId of allUserIds) {
    favoriteSets.set(userId, new Set<string>());
  }

  for (const row of (favoritesResult.data ?? []) as ProductListRow[]) {
    if (row.list_type !== "favorites" || !row.product_slug) {
      continue;
    }

    const set = favoriteSets.get(row.user_id);
    if (!set) {
      continue;
    }

    set.add(row.product_slug);
  }

  for (const [userId, favorites] of favoriteSets.entries()) {
    const aggregate = aggregates.get(userId);
    if (!aggregate) continue;
    aggregate.favoriteCount = favorites.size;
  }

  for (const row of (followerCountResult.data ?? []) as FollowerCountRow[]) {
    if (!row.following_user_id) {
      continue;
    }

    const aggregate = aggregates.get(row.following_user_id);
    if (!aggregate) {
      continue;
    }

    aggregate.followerCount += 1;
  }

  for (const aggregate of aggregates.values()) {
    aggregate.points = calculateProfilePoints({
      ratingCount: aggregate.ratingCount,
      commentCount: aggregate.commentCount,
      favoriteCount: aggregate.favoriteCount,
      followerCount: aggregate.followerCount,
    });

    const levelInfo = getProfileLevelInfo(aggregate.points);
    aggregate.currentLevelName = levelInfo.currentLevelName;
    aggregate.nextLevelName = levelInfo.nextLevelName;
    aggregate.pointsToNextLevel = levelInfo.pointsToNextLevel;
  }

  const standings = [viewerUserId, ...comparedUserIds]
    .map((userId) => aggregates.get(userId))
    .filter((entry): entry is FriendAggregate => entry !== undefined)
    .sort((left, right) => {
      if (left.points !== right.points) {
        return right.points - left.points;
      }
      if (left.followerCount !== right.followerCount) {
        return right.followerCount - left.followerCount;
      }
      if (left.ratingCount !== right.ratingCount) {
        return right.ratingCount - left.ratingCount;
      }
      return left.username.localeCompare(right.username, "de");
    })
    .map((entry, index) => ({
      userId: entry.userId,
      username: entry.username,
      points: entry.points,
      currentLevelName: entry.currentLevelName,
      ratingCount: entry.ratingCount,
      commentCount: entry.commentCount,
      favoriteCount: entry.favoriteCount,
      followerCount: entry.followerCount,
      rank: index + 1,
      isViewer: entry.userId === viewerUserId,
    }));

  const viewerAggregate = aggregates.get(viewerUserId) ?? createAggregate(viewerUserId, "Du");
  const viewerStanding = standings.find((entry) => entry.userId === viewerUserId);

  let tasteMatch: {
    userId: string;
    username: string;
    matchScore: number;
    overlapCount: number;
    averageDifference: number;
  } | null = null;

  for (const userId of comparedUserIds) {
    const candidate = aggregates.get(userId);
    if (!candidate) continue;

    const match = buildTasteMatch(viewerAggregate.ratingsByProduct, candidate.ratingsByProduct);
    if (!match) continue;

    if (
      !tasteMatch ||
      match.matchScore > tasteMatch.matchScore ||
      (match.matchScore === tasteMatch.matchScore && match.overlapCount > tasteMatch.overlapCount)
    ) {
      tasteMatch = {
        userId: candidate.userId,
        username: candidate.username,
        matchScore: match.matchScore,
        overlapCount: match.overlapCount,
        averageDifference: Number(match.averageDifference.toFixed(2)),
      };
    }
  }

  const closestRival = standings
    .filter((entry) => !entry.isViewer)
    .sort((left, right) => {
      const leftDiff = Math.abs(left.points - viewerAggregate.points);
      const rightDiff = Math.abs(right.points - viewerAggregate.points);
      if (leftDiff !== rightDiff) {
        return leftDiff - rightDiff;
      }
      return left.rank - right.rank;
    })[0] ?? null;

  return NextResponse.json({
    success: true,
    data: {
      network: {
        followingCount: followingUserIds.length,
        mutualFriendsCount: mutualFriendIds.length,
        comparedAsFriends: mutualFriendIds.length > 0,
      },
      viewer: {
        username: viewerAggregate.username,
        points: viewerAggregate.points,
        currentLevelName: viewerAggregate.currentLevelName,
        nextLevelName: viewerAggregate.nextLevelName,
        pointsToNextLevel: viewerAggregate.pointsToNextLevel,
        ratingCount: viewerAggregate.ratingCount,
        commentCount: viewerAggregate.commentCount,
        favoriteCount: viewerAggregate.favoriteCount,
        followerCount: viewerAggregate.followerCount,
        rank: viewerStanding?.rank ?? 1,
        totalPlayers: standings.length,
      },
      standings,
      tasteMatch,
      closestRival,
    },
  });
}