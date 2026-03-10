import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getSupabaseAdminClient,
  USER_FOLLOWS_TABLE,
  USER_PROFILES_TABLE,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

type ProfileRow = {
  user_id: string;
  username: string | null;
};

type FollowRow = {
  following_user_id: string;
};

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 40;
const LIMIT = 20;

export async function GET(req: NextRequest) {
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
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ success: true, data: [] });
  }

  const normalizedQuery = query.slice(0, MAX_QUERY_LENGTH);

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, username")
    .ilike("username", `%${normalizedQuery}%`)
    .order("username", { ascending: true })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  const candidates = ((data ?? []) as ProfileRow[])
    .map((row) => ({
      userId: row.user_id,
      username: typeof row.username === "string" ? row.username.trim() : "",
    }))
    .filter((row) => row.username.length > 0 && row.userId !== viewerUserId);

  if (candidates.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const userIds = candidates.map((row) => row.userId);

  const { data: followData, error: followError } = await supabase
    .from(USER_FOLLOWS_TABLE)
    .select("following_user_id")
    .eq("follower_user_id", viewerUserId)
    .in("following_user_id", userIds);

  if (followError) {
    return NextResponse.json(
      { success: false, error: followError.message },
      { status: 400 }
    );
  }

  const followingSet = new Set(
    ((followData ?? []) as FollowRow[]).map((row) => row.following_user_id)
  );

  const results = candidates.map((row) => ({
    userId: row.userId,
    username: row.username,
    isFollowing: followingSet.has(row.userId),
  }));

  return NextResponse.json({ success: true, data: results });
}

