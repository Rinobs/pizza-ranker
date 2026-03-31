import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  buildReviewLikeStateMap,
  isReviewLikesSchemaMissingError,
  isValidReviewUserId,
  type ReviewLikeRow,
} from "@/lib/review-likes";
import {
  RATINGS_TABLE,
  REVIEW_LIKES_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9-]+$/;

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

  let body: {
    productSlug?: unknown;
    reviewUserId?: unknown;
    active?: unknown;
  };

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
  const reviewUserId =
    typeof body.reviewUserId === "string" ? body.reviewUserId.trim() : "";

  if (!PRODUCT_SLUG_PATTERN.test(productSlug)) {
    return NextResponse.json(
      { success: false, error: "Invalid product slug" },
      { status: 400 }
    );
  }

  if (!isValidReviewUserId(reviewUserId)) {
    return NextResponse.json(
      { success: false, error: "Invalid review user id" },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);

  if (userId === reviewUserId) {
    return NextResponse.json(
      { success: false, error: "Eigene Kommentare kannst du nicht liken." },
      { status: 400 }
    );
  }

  const active = body.active !== false;

  const reviewResult = await supabase
    .from(RATINGS_TABLE)
    .select("user_id, comment")
    .eq("user_id", reviewUserId)
    .eq("product_slug", productSlug)
    .maybeSingle();

  if (reviewResult.error) {
    return NextResponse.json(
      { success: false, error: reviewResult.error.message },
      { status: 400 }
    );
  }

  const review = reviewResult.data as { user_id: string; comment: string | null } | null;

  if (!review || typeof review.comment !== "string" || review.comment.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "Kommentar nicht gefunden." },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  if (active) {
    const { error } = await supabase.from(REVIEW_LIKES_TABLE).upsert(
      {
        user_id: userId,
        review_user_id: reviewUserId,
        product_slug: productSlug,
        updated_at: now,
      },
      { onConflict: "user_id,review_user_id,product_slug" }
    );

    if (error) {
      if (isReviewLikesSchemaMissingError(error.message)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Kommentar-Likes sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
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
      .from(REVIEW_LIKES_TABLE)
      .delete()
      .eq("user_id", userId)
      .eq("review_user_id", reviewUserId)
      .eq("product_slug", productSlug);

    if (error) {
      if (isReviewLikesSchemaMissingError(error.message)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Kommentar-Likes sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
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

  const likesResult = await supabase
    .from(REVIEW_LIKES_TABLE)
    .select("user_id, review_user_id, product_slug, inserted_at, updated_at")
    .eq("review_user_id", reviewUserId)
    .eq("product_slug", productSlug);

  if (likesResult.error) {
    if (isReviewLikesSchemaMissingError(likesResult.error.message)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Kommentar-Likes sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: likesResult.error.message },
      { status: 400 }
    );
  }

  const likeState =
    buildReviewLikeStateMap((likesResult.data ?? []) as ReviewLikeRow[], userId).get(
      `${reviewUserId}:${productSlug}`
    ) ?? {
      likeCount: 0,
      viewerLiked: false,
    };

  return NextResponse.json({
    success: true,
    data: {
      productSlug,
      reviewUserId,
      likeCount: likeState.likeCount,
      viewerLiked: likeState.viewerLiked,
    },
  });
}
