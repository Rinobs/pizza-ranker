import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdminClient, USER_PROFILES_TABLE } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const MAX_USERNAME_LENGTH = 40;
const MIN_USERNAME_LENGTH = 2;

type ProfileRow = {
  username: string | null;
};

function normalizeUsername(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length < MIN_USERNAME_LENGTH || trimmed.length > MAX_USERNAME_LENGTH) {
    return null;
  }

  return trimmed;
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
    .from(USER_PROFILES_TABLE)
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  const row = data as ProfileRow | null;

  return NextResponse.json({
    success: true,
    data: {
      username: row?.username ?? null,
    },
  });
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

  let body: { username?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const username = normalizeUsername(body.username);
  if (!username) {
    return NextResponse.json(
      {
        success: false,
        error: `Username must be between ${MIN_USERNAME_LENGTH} and ${MAX_USERNAME_LENGTH} characters`,
      },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .upsert(
      {
        user_id: userId,
        username,
        updated_at: now,
      },
      { onConflict: "user_id" }
    )
    .select("username")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  const row = data as ProfileRow;

  return NextResponse.json({
    success: true,
    data: {
      username: row.username,
    },
  });
}
