import { NextResponse } from "next/server";
import {
  buildCustomLists,
  isCustomListSchemaMissingError,
  type CustomListItemRow,
  type CustomListRow,
} from "@/lib/custom-lists";
import {
  USER_CUSTOM_LIST_ITEMS_TABLE,
  USER_CUSTOM_LISTS_TABLE,
  USER_PROFILES_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";

const PROFILE_SELECT = "user_id, username, avatar_url";
const LIST_LIMIT = 48;
const RESULT_LIMIT = 8;

type ProfileRow = {
  user_id: string;
  username: string | null;
  avatar_url?: string | null;
};

function isMissingAvatarFieldError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("column") && normalized.includes("avatar_url");
}

function getTimestampValue(value: string | null) {
  if (!value) return 0;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function loadProfiles(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userIds: string[]
) {
  const extendedResult = await supabase
    .from(USER_PROFILES_TABLE)
    .select(PROFILE_SELECT)
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
    .select("user_id, username")
    .in("user_id", userIds);

  return {
    rows: (basicResult.data ?? []) as ProfileRow[],
    error: basicResult.error,
  };
}

export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({
      success: true,
      data: {
        lists: [],
        generatedAt: new Date().toISOString(),
      },
    });
  }

  const customListsResult = await supabase
    .from(USER_CUSTOM_LISTS_TABLE)
    .select("id, user_id, name, inserted_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (customListsResult.error) {
    if (isCustomListSchemaMissingError(customListsResult.error.message)) {
      return NextResponse.json({
        success: true,
        data: {
          lists: [],
          generatedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: customListsResult.error.message },
      { status: 400 }
    );
  }

  const customListRows = (customListsResult.data ?? []) as CustomListRow[];

  if (customListRows.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        lists: [],
        generatedAt: new Date().toISOString(),
      },
    });
  }

  const [itemsResult, profilesResult] = await Promise.all([
    supabase
      .from(USER_CUSTOM_LIST_ITEMS_TABLE)
      .select("list_id, product_slug, inserted_at, updated_at")
      .in(
        "list_id",
        customListRows.map((row) => row.id)
      )
      .order("updated_at", { ascending: false }),
    loadProfiles(
      supabase,
      Array.from(new Set(customListRows.map((row) => row.user_id)))
    ),
  ]);

  if (itemsResult.error) {
    if (isCustomListSchemaMissingError(itemsResult.error.message)) {
      return NextResponse.json({
        success: true,
        data: {
          lists: [],
          generatedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { success: false, error: itemsResult.error.message },
      { status: 400 }
    );
  }

  if (profilesResult.error) {
    return NextResponse.json(
      { success: false, error: profilesResult.error.message },
      { status: 400 }
    );
  }

  const customLists = buildCustomLists(
    customListRows,
    (itemsResult.data ?? []) as CustomListItemRow[]
  );

  const profileByUserId = new Map(
    profilesResult.rows.map((row) => [
      row.user_id,
      {
        username:
          typeof row.username === "string" && row.username.trim().length > 0
            ? row.username.trim()
            : "Food Friend",
        avatarUrl:
          typeof row.avatar_url === "string" && row.avatar_url.trim().length > 0
            ? row.avatar_url.trim()
            : null,
      },
    ])
  );

  const lists = customLists
    .filter((list) => list.itemCount > 0)
    .sort((left, right) => {
      if (right.itemCount !== left.itemCount) {
        return right.itemCount - left.itemCount;
      }

      return (
        getTimestampValue(right.updatedAt || right.insertedAt) -
        getTimestampValue(left.updatedAt || left.insertedAt)
      );
    })
    .slice(0, RESULT_LIMIT)
    .map((list) => {
      const owner = profileByUserId.get(list.userId);

      return {
        ...list,
        username: owner?.username ?? "Food Friend",
        avatarUrl: owner?.avatarUrl ?? null,
      };
    });

  return NextResponse.json({
    success: true,
    data: {
      lists,
      generatedAt: new Date().toISOString(),
    },
  });
}
