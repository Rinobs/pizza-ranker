import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  applyProductBaseToCustomLists,
  buildCustomLists,
  getCustomListNameValidationMessage,
  isCustomListNameConflictError,
  isCustomListSchemaMissingError,
  normalizeCustomListName,
  type CustomListItemRow,
  type CustomListRow,
} from "@/lib/custom-lists";
import { resolveProductSummariesByRouteSlug } from "@/lib/imported-products";
import {
  USER_CUSTOM_LIST_ITEMS_TABLE,
  USER_CUSTOM_LISTS_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const LIST_SELECT = "id, user_id, name, inserted_at, updated_at";
const ITEM_SELECT = "list_id, product_slug, inserted_at, updated_at";

async function loadUserCustomLists(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string
) {
  const listsResult = await supabase
    .from(USER_CUSTOM_LISTS_TABLE)
    .select(LIST_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (listsResult.error) {
    if (isCustomListSchemaMissingError(listsResult.error.message)) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: null,
      error: listsResult.error.message,
    };
  }

  const listRows = (listsResult.data ?? []) as CustomListRow[];

  if (listRows.length === 0) {
    return {
      data: [],
      error: null,
    };
  }

  const itemResult = await supabase
    .from(USER_CUSTOM_LIST_ITEMS_TABLE)
    .select(ITEM_SELECT)
    .in(
      "list_id",
      listRows.map((row) => row.id)
    )
    .order("updated_at", { ascending: false });

  if (itemResult.error) {
    if (isCustomListSchemaMissingError(itemResult.error.message)) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: null,
      error: itemResult.error.message,
    };
  }

  const lists = buildCustomLists(
    listRows,
    (itemResult.data ?? []) as CustomListItemRow[],
    { previewLimit: Number.MAX_SAFE_INTEGER }
  );
  const routeSlugs = Array.from(
    new Set(
      lists.flatMap((list) => list.items.map((item) => item.productSlug))
    )
  );
  const resolvedProducts = await resolveProductSummariesByRouteSlug(routeSlugs);

  return {
    data: applyProductBaseToCustomLists(lists, resolvedProducts),
    error: null,
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
  const { data, error } = await loadUserCustomLists(supabase, userId);

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    data,
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

  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const name = typeof body.name === "string" ? normalizeCustomListName(body.name) : "";
  const validationMessage = getCustomListNameValidationMessage(name);

  if (validationMessage) {
    return NextResponse.json(
      { success: false, error: validationMessage },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);
  const now = new Date().toISOString();

  const { error } = await supabase.from(USER_CUSTOM_LISTS_TABLE).insert({
    id: crypto.randomUUID(),
    user_id: userId,
    name,
    inserted_at: now,
    updated_at: now,
  });

  if (error) {
    if (isCustomListSchemaMissingError(error.message)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Eigene Listen sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
        },
        { status: 503 }
      );
    }

    if (isCustomListNameConflictError(error.message)) {
      return NextResponse.json(
        { success: false, error: "Du hast bereits eine Liste mit diesem Namen." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  const refreshed = await loadUserCustomLists(supabase, userId);

  if (refreshed.error) {
    return NextResponse.json(
      { success: false, error: refreshed.error },
      { status: 400 }
    );
  }

  const createdList =
    (refreshed.data ?? []).find(
      (entry) => entry.name.toLowerCase() === name.toLowerCase()
    ) ?? null;

  return NextResponse.json({
    success: true,
    data: createdList,
  });
}
