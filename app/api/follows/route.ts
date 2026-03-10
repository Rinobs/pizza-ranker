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

type FollowRow = {
  following_user_id: string;
  inserted_at: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
};

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
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

  const userId = getStableUserId(userEmail);

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

  const rows = (data ?? []) as FollowRow[];
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

  const profileByUserId = new Map<string, string>();

  for (const row of (profileData ?? []) as ProfileRow[]) {
    const username = typeof row.username === "string" ? row.username.trim() : "";
    if (!username) continue;
    profileByUserId.set(row.user_id, username);
  }

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

