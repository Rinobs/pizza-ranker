import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdminClient, USER_PROFILES_TABLE } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  hasStoredUsername,
  normalizeUsername,
} from "@/lib/username";

type ProfileRow = {
  user_id?: string;
  username: string | null;
};

function buildProfilePayload(row: ProfileRow | null) {
  const username = hasStoredUsername(row?.username) ? row?.username?.trim() ?? null : null;

  return {
    username,
    hasUsername: username !== null,
    canSetUsername: username === null,
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

  const userId = getStableUserId(userEmail);

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: buildProfilePayload((data as ProfileRow | null) ?? null),
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
        error: `Username muss zwischen ${MIN_USERNAME_LENGTH} und ${MAX_USERNAME_LENGTH} Zeichen lang sein.`,
      },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);
  const now = new Date().toISOString();

  const { data: existingProfileData, error: existingProfileError } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, username")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json(
      { success: false, error: existingProfileError.message },
      { status: 400 }
    );
  }

  const existingProfile = (existingProfileData as ProfileRow | null) ?? null;

  if (hasStoredUsername(existingProfile?.username)) {
    return NextResponse.json(
      {
        success: false,
        error: "Dein Username wurde bereits festgelegt und kann nicht mehr geaendert werden.",
      },
      { status: 409 }
    );
  }

  const { data: duplicateData, error: duplicateError } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, username")
    .ilike("username", username)
    .neq("user_id", userId)
    .limit(1);

  if (duplicateError) {
    return NextResponse.json(
      { success: false, error: duplicateError.message },
      { status: 400 }
    );
  }

  const duplicateProfile = Array.isArray(duplicateData)
    ? (duplicateData as ProfileRow[]).find((row) => hasStoredUsername(row.username))
    : null;

  if (duplicateProfile) {
    return NextResponse.json(
      {
        success: false,
        error: "Dieser Username ist bereits vergeben. Bitte waehle einen anderen.",
      },
      { status: 409 }
    );
  }

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
    .select("user_id, username")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: buildProfilePayload(data as ProfileRow),
  });
}
