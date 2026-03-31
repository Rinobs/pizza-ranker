import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdminClient, USER_PRODUCT_LISTS_TABLE } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9-]+$/;
const VALID_LIST_TYPES = ["favorites", "want_to_try", "tried"] as const;
type ListType = (typeof VALID_LIST_TYPES)[number];

type ProductListRow = {
  product_slug: string;
  list_type: ListType;
  inserted_at: string | null;
};

function isValidListType(value: unknown): value is ListType {
  return typeof value === "string" && VALID_LIST_TYPES.includes(value as ListType);
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
    .from(USER_PRODUCT_LISTS_TABLE)
    .select("product_slug, list_type, inserted_at")
    .eq("user_id", userId)
    .order("inserted_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: (data ?? []) as ProductListRow[],
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

  let body: { productSlug?: unknown; listType?: unknown; active?: unknown };
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

  if (!isValidListType(body.listType)) {
    return NextResponse.json(
      { success: false, error: "Invalid list type" },
      { status: 400 }
    );
  }

  const active = body.active !== false;
  const userId = getStableUserId(userEmail);

  if (active) {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from(USER_PRODUCT_LISTS_TABLE)
      .upsert(
        {
          user_id: userId,
          product_slug: productSlug,
          list_type: body.listType,
          updated_at: now,
        },
        { onConflict: "user_id,product_slug,list_type" }
      );

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (body.listType === "tried") {
      const { error: cleanupError } = await supabase
        .from(USER_PRODUCT_LISTS_TABLE)
        .delete()
        .eq("user_id", userId)
        .eq("product_slug", productSlug)
        .eq("list_type", "want_to_try");

      if (cleanupError) {
        return NextResponse.json(
          { success: false, error: cleanupError.message },
          { status: 400 }
        );
      }
    }
  } else {
    const { error } = await supabase
      .from(USER_PRODUCT_LISTS_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("product_slug", productSlug)
      .eq("list_type", body.listType);

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
      productSlug,
      listType: body.listType,
      active,
    },
  });
}
