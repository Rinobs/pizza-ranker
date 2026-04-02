import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getSupabaseAdminClient,
  RATINGS_TABLE,
  REVIEW_LIKES_TABLE,
  REVIEW_REPLIES_TABLE,
} from "@/lib/supabase";
import { isReviewRepliesSchemaMissingError } from "@/lib/review-replies";
import {
  getReviewCommentValidationError,
  normalizeReviewComment,
} from "@/lib/review-comments";
import { getStableUserId } from "@/lib/user-id";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9-]+$/;

function normalizeRating(value: unknown) {
  let parsed: number | null = null;

  if (typeof value === "number") {
    parsed = Number.isFinite(value) ? value : null;
  } else if (typeof value === "string") {
    const normalized = value.replace(",", ".").trim();
    if (normalized.length > 0) {
      const numeric = Number(normalized);
      parsed = Number.isFinite(numeric) ? numeric : null;
    }
  }

  if (parsed === null) {
    return null;
  }

  if (parsed < 0 || parsed > 5) {
    return null;
  }

  const rounded = Math.round(parsed * 2) / 2;
  if (Math.abs(parsed - rounded) > 1e-6) {
    return null;
  }

  return rounded;
}
async function clearReviewLikes(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string,
  productSlug: string
) {
  return supabase
    .from(REVIEW_LIKES_TABLE)
    .delete()
    .eq("review_user_id", userId)
    .eq("product_slug", productSlug);
}

async function clearReviewReplies(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string,
  productSlug: string
) {
  return supabase
    .from(REVIEW_REPLIES_TABLE)
    .delete()
    .eq("review_user_id", userId)
    .eq("product_slug", productSlug);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const userId = getStableUserId(userEmail);

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  let body: { productSlug?: unknown; rating?: unknown; comment?: unknown };
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

  const rating = normalizeRating(body.rating);
  if (rating === null) {
    return NextResponse.json(
      { success: false, error: "Rating must be between 0 and 5 in 0.5 steps" },
      { status: 400 }
    );
  }

  const commentValidationError = getReviewCommentValidationError(body.comment);
  if (commentValidationError) {
    return NextResponse.json(
      { success: false, error: commentValidationError },
      { status: 400 }
    );
  }

  const comment = normalizeReviewComment(body.comment);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .upsert(
      {
        user_id: userId,
        product_slug: productSlug,
        rating,
        comment,
        updated_at: now,
      },
      { onConflict: "user_id,product_slug" }
    )
    .select("product_slug, rating, comment, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  if (comment === null) {
    const { error: likeCleanupError } = await clearReviewLikes(
      supabase,
      userId,
      productSlug
    );

    if (likeCleanupError) {
      return NextResponse.json(
        { success: false, error: likeCleanupError.message },
        { status: 400 }
      );
    }

    const { error: replyCleanupError } = await clearReviewReplies(
      supabase,
      userId,
      productSlug
    );

    if (
      replyCleanupError &&
      !isReviewRepliesSchemaMissingError(replyCleanupError.message)
    ) {
      return NextResponse.json(
        { success: false, error: replyCleanupError.message },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ success: true, data });
}
