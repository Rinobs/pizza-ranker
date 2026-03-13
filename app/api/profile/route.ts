import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdminClient, USER_PROFILES_TABLE } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_AVATAR_MAX_CHARS,
  normalizeProfileAvatarUrl,
  normalizeProfileBio,
} from "@/lib/profile-features";
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  hasStoredUsername,
  normalizeUsername,
} from "@/lib/username";

type ProfileRow = {
  user_id?: string;
  username: string | null;
  bio?: string | null;
  avatar_url?: string | null;
};

const BASIC_PROFILE_SELECT = "user_id, username";
const EXTENDED_PROFILE_SELECT = "user_id, username, bio, avatar_url";

function isMissingProfileFieldError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && (normalized.includes("bio") || normalized.includes("avatar_url"));
}

async function loadProfileRow(
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
      supportsProfileDetails: true,
      error: null,
    };
  }

  if (!isMissingProfileFieldError(extendedResult.error.message)) {
    return {
      row: null,
      supportsProfileDetails: false,
      error: extendedResult.error,
    };
  }

  const basicResult = await supabase
    .from(USER_PROFILES_TABLE)
    .select(BASIC_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (basicResult.error) {
    return {
      row: null,
      supportsProfileDetails: false,
      error: basicResult.error,
    };
  }

  return {
    row: (basicResult.data as ProfileRow | null) ?? null,
    supportsProfileDetails: false,
    error: null,
  };
}

function buildProfilePayload(row: ProfileRow | null, supportsProfileDetails: boolean) {
  const username = hasStoredUsername(row?.username) ? row?.username?.trim() ?? null : null;
  const bio = typeof row?.bio === "string" ? row.bio.trim() || null : null;
  const avatarUrl =
    typeof row?.avatar_url === "string" && row.avatar_url.trim().length > 0
      ? row.avatar_url.trim()
      : null;

  return {
    username,
    hasUsername: username !== null,
    canSetUsername: username === null,
    bio,
    avatarUrl,
    supportsProfileDetails,
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
  const { row, supportsProfileDetails, error } = await loadProfileRow(supabase, userId);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: buildProfilePayload(row, supportsProfileDetails),
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

  const existingProfileResult = await loadProfileRow(supabase, userId);
  if (existingProfileResult.error) {
    return NextResponse.json(
      { success: false, error: existingProfileResult.error.message },
      { status: 400 }
    );
  }

  const existingProfile = existingProfileResult.row;

  if (hasStoredUsername(existingProfile?.username)) {
    return NextResponse.json(
      {
        success: false,
        error: "Dein Username wurde bereits festgelegt und kann nicht mehr geändert werden.",
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
        error: "Dieser Username ist bereits vergeben. Bitte wähle einen anderen.",
      },
      { status: 409 }
    );
  }

  const { error: upsertError } = await supabase
    .from(USER_PROFILES_TABLE)
    .upsert(
      {
        user_id: userId,
        username,
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    return NextResponse.json(
      { success: false, error: upsertError.message },
      { status: 400 }
    );
  }

  const savedProfileResult = await loadProfileRow(supabase, userId);
  if (savedProfileResult.error) {
    return NextResponse.json(
      { success: false, error: savedProfileResult.error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: buildProfilePayload(
      savedProfileResult.row,
      savedProfileResult.supportsProfileDetails
    ),
  });
}

export async function PATCH(req: NextRequest) {
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

  let body: { bio?: unknown; avatarUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);
  const existingProfileResult = await loadProfileRow(supabase, userId);

  if (existingProfileResult.error) {
    return NextResponse.json(
      { success: false, error: existingProfileResult.error.message },
      { status: 400 }
    );
  }

  if (!existingProfileResult.supportsProfileDetails) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Profilbild und Bio brauchen die neuen Profilspalten in Supabase. Bitte aktualisiere zuerst supabase/ratings_schema.sql in deiner Datenbank.",
      },
      { status: 409 }
    );
  }

  const existingProfile = existingProfileResult.row;

  if (!hasStoredUsername(existingProfile?.username)) {
    return NextResponse.json(
      {
        success: false,
        error: "Lege zuerst deinen Username fest, bevor du Bio oder Profilbild speicherst.",
      },
      { status: 409 }
    );
  }

  const hasBioUpdate = Object.prototype.hasOwnProperty.call(body, "bio");
  const hasAvatarUpdate = Object.prototype.hasOwnProperty.call(body, "avatarUrl");

  if (!hasBioUpdate && !hasAvatarUpdate) {
    return NextResponse.json(
      { success: false, error: "Keine Profil-Änderungen übergeben." },
      { status: 400 }
    );
  }

  if (hasBioUpdate && body.bio !== null && typeof body.bio !== "string") {
    return NextResponse.json(
      { success: false, error: "Bio muss Text sein." },
      { status: 400 }
    );
  }

  if (typeof body.bio === "string" && body.bio.trim().length > PROFILE_BIO_MAX_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Die Bio darf maximal ${PROFILE_BIO_MAX_LENGTH} Zeichen lang sein.`,
      },
      { status: 400 }
    );
  }

  if (hasAvatarUpdate && body.avatarUrl !== null && typeof body.avatarUrl !== "string") {
    return NextResponse.json(
      { success: false, error: "Profilbild muss als Bild-String gespeichert werden." },
      { status: 400 }
    );
  }

  if (typeof body.avatarUrl === "string" && body.avatarUrl.trim().length > PROFILE_AVATAR_MAX_CHARS) {
    return NextResponse.json(
      {
        success: false,
        error: "Das Profilbild ist zu groß. Bitte wähle eine kleinere Datei.",
      },
      { status: 400 }
    );
  }

  const nextBio = hasBioUpdate
    ? normalizeProfileBio(body.bio)
    : typeof existingProfile?.bio === "string"
      ? existingProfile.bio
      : null;

  const nextAvatarUrl = hasAvatarUpdate
    ? normalizeProfileAvatarUrl(body.avatarUrl)
    : typeof existingProfile?.avatar_url === "string"
      ? existingProfile.avatar_url
      : null;

  if (
    hasAvatarUpdate &&
    typeof body.avatarUrl === "string" &&
    body.avatarUrl.trim().length > 0 &&
    nextAvatarUrl === null
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Bitte lade ein gültiges JPG-, PNG- oder WebP-Bild hoch.",
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from(USER_PROFILES_TABLE)
    .update({
      bio: nextBio,
      avatar_url: nextAvatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 400 }
    );
  }

  const savedProfileResult = await loadProfileRow(supabase, userId);
  if (savedProfileResult.error) {
    return NextResponse.json(
      { success: false, error: savedProfileResult.error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: buildProfilePayload(savedProfileResult.row, true),
  });
}

