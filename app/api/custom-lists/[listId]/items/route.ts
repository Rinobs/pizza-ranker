import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isCustomListSchemaMissingError } from "@/lib/custom-lists";
import {
  USER_CUSTOM_LIST_ITEMS_TABLE,
  USER_CUSTOM_LISTS_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9-]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ listId: string }> }
) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { listId } = await context.params;

  if (!isUuid(listId)) {
    return NextResponse.json(
      { success: false, error: "Ungültige Listen-ID" },
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

  let body: { productSlug?: unknown; active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const productSlug =
    typeof body.productSlug === "string" ? body.productSlug.trim() : "";

  if (!PRODUCT_SLUG_PATTERN.test(productSlug)) {
    return NextResponse.json(
      { success: false, error: "Invalid product slug" },
      { status: 400 }
    );
  }

  const active = body.active !== false;
  const userId = getStableUserId(userEmail);

  const listResult = await supabase
    .from(USER_CUSTOM_LISTS_TABLE)
    .select("id")
    .eq("id", listId)
    .eq("user_id", userId)
    .maybeSingle();

  if (listResult.error) {
    if (isCustomListSchemaMissingError(listResult.error.message)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Eigene Listen sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: listResult.error.message },
      { status: 400 }
    );
  }

  if (!listResult.data) {
    return NextResponse.json(
      { success: false, error: "Liste nicht gefunden." },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  if (active) {
    const { error } = await supabase.from(USER_CUSTOM_LIST_ITEMS_TABLE).upsert(
      {
        list_id: listId,
        product_slug: productSlug,
        updated_at: now,
      },
      { onConflict: "list_id,product_slug" }
    );

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

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
  } else {
    const { error } = await supabase
      .from(USER_CUSTOM_LIST_ITEMS_TABLE)
      .delete()
      .eq("list_id", listId)
      .eq("product_slug", productSlug);

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

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
  }

  const listTouchResult = await supabase
    .from(USER_CUSTOM_LISTS_TABLE)
    .update({ updated_at: now })
    .eq("id", listId)
    .eq("user_id", userId);

  if (listTouchResult.error && !isCustomListSchemaMissingError(listTouchResult.error.message)) {
    return NextResponse.json(
      { success: false, error: listTouchResult.error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      listId,
      productSlug,
      active,
    },
  });
}
