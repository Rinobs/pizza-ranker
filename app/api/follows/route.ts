import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getSupabaseAdminClient,
  USER_FOLLOWS_TABLE,
  USER_PROFILES_TABLE,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type FollowingRow = {
  following_user_id: string;
  inserted_at: string | null;
};

type FollowerRow = {
  follower_user_id: string;
  inserted_at: string | null;
};

type FollowBackRow = {
  following_user_id: string;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
};

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function buildProfileByUserId(rows: ProfileRow[]) {
  const map = new Map<string, string>();

  for (const row of rows) {
    const username = typeof row.username === "string" ? row.username.trim() : "";
    if (!username) continue;
    map.set(row.user_id, username);
  }

  return map;
}

export async function GET(request: NextRequest) {
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

  const userId = getStableUserId(userEmail);
  const requestedType = (request.nextUrl.searchParams.get("type") || "following")
    .trim()
    .toLowerCase();

  if (requestedType !== "following" && requestedType !== "followers") {
    return NextResponse.json(
      { success: false, error: "Invalid follow list type" },
      { status: 400 }
    );
  }

  if (requestedType === "following") {
    const { data, error } = await supabase
      .from(USER_FOLLOWS_TABLE)
      .select("following_user_id, inserted_at")
      .eq("follower_user_id", userId)
      .order("inserted_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const rows = (data ?? []) as FollowingRow[];
    if (rows.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const followedUserIds = Array.from(new Set(rows.map((row) => row.following_user_id)));

    const { data: profileData, error: profileError } = await supabase
      .from(USER_PROFILES_TABLE)
      .select("user_id, username")
      .in("user_id", followedUserIds);

    if (profileError) {
      return NextResponse.json(
        { success: false, error: profileError.message },
        { status: 400 }
      );
    }

    const profileByUserId = buildProfileByUserId((profileData ?? []) as ProfileRow[]);

    const result = rows
      .filter((row) => isUuid(row.following_user_id))
      .map((row) => ({
        userId: row.following_user_id,
        username: profileByUserId.get(row.following_user_id) ?? "Unbekannt",
        isFollowing: true,
        followedAt: row.inserted_at,
      }));

    return NextResponse.json({ success: true, data: result });
  }

  const { data, error } = await supabase
    .from(USER_FOLLOWS_TABLE)
    .select("follower_user_id, inserted_at")
    .eq("following_user_id", userId)
    .order("inserted_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  const rows = (data ?? []) as FollowerRow[];
  if (rows.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const followerUserIds = Array.from(new Set(rows.map((row) => row.follower_user_id)));

  const [{ data: profileData, error: profileError }, { data: followBackData, error: followBackError }] =
    await Promise.all([
      supabase.from(USER_PROFILES_TABLE).select("user_id, username").in("user_id", followerUserIds),
      supabase
        .from(USER_FOLLOWS_TABLE)
        .select("following_user_id")
        .eq("follower_user_id", userId)
        .in("following_user_id", followerUserIds),
    ]);

  if (profileError) {
    return NextResponse.json(
      { success: false, error: profileError.message },
      { status: 400 }
    );
  }

  if (followBackError) {
    return NextResponse.json(
      { success: false, error: followBackError.message },
      { status: 400 }
    );
  }

  const profileByUserId = buildProfileByUserId((profileData ?? []) as ProfileRow[]);
  const followingBackSet = new Set(
    ((followBackData ?? []) as FollowBackRow[]).map((row) => row.following_user_id)
  );

  const result = rows
    .filter((row) => isUuid(row.follower_user_id))
    .map((row) => ({
      userId: row.follower_user_id,
      username: profileByUserId.get(row.follower_user_id) ?? "Unbekannt",
      isFollowing: followingBackSet.has(row.follower_user_id),
      followedAt: row.inserted_at,
    }));

  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
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

  let body: { targetUserId?: unknown; active?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const targetUserId =
    typeof body.targetUserId === "string" ? body.targetUserId.trim() : "";

  if (!isUuid(targetUserId)) {
    return NextResponse.json(
      { success: false, error: "Invalid target user id" },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);

  if (targetUserId === userId) {
    return NextResponse.json(
      { success: false, error: "Du kannst dir nicht selbst folgen." },
      { status: 400 }
    );
  }

  const { data: profileData, error: profileError } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { success: false, error: profileError.message },
      { status: 400 }
    );
  }

  if (!profileData) {
    return NextResponse.json(
      { success: false, error: "Profil nicht gefunden" },
      { status: 404 }
    );
  }

  const active = body.active !== false;

  if (active) {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from(USER_FOLLOWS_TABLE)
      .upsert(
        {
          follower_user_id: userId,
          following_user_id: targetUserId,
          updated_at: now,
        },
        { onConflict: "follower_user_id,following_user_id" }
      );

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
  } else {
    const { error } = await supabase
      .from(USER_FOLLOWS_TABLE)
      .delete()
      .eq("follower_user_id", userId)
      .eq("following_user_id", targetUserId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      targetUserId,
      active,
    },
  });
}
