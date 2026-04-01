import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isValidReviewUserId } from "@/lib/review-likes";
import { isReviewRepliesSchemaMissingError } from "@/lib/review-replies";
import {
  RATINGS_TABLE,
  REVIEW_REPLIES_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9-]+$/;
const MAX_REPLY_LENGTH = 1000;

function normalizeReplyText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, MAX_REPLY_LENGTH);
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

  let body: {
    productSlug?: unknown;
    reviewUserId?: unknown;
    text?: unknown;
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

  if (typeof body.text === "string" && body.text.trim().length > MAX_REPLY_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        error: `Reply must be at most ${MAX_REPLY_LENGTH} characters`,
      },
      { status: 400 }
    );
  }

  const text = normalizeReplyText(body.text);
  if (!text) {
    return NextResponse.json(
      { success: false, error: "Bitte schreibe erst eine Antwort." },
      { status: 400 }
    );
  }

  const userId = getStableUserId(userEmail);

  if (userId === reviewUserId) {
    return NextResponse.json(
      {
        success: false,
        error: "Deine eigene Review bearbeitest du direkt statt darauf zu antworten.",
      },
      { status: 400 }
    );
  }

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
      { success: false, error: "Review nicht gefunden." },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(REVIEW_REPLIES_TABLE)
    .insert({
      user_id: userId,
      review_user_id: reviewUserId,
      product_slug: productSlug,
      text,
      updated_at: now,
    })
    .select("id, user_id, review_user_id, product_slug, text, inserted_at, updated_at")
    .single();

  if (error) {
    if (isReviewRepliesSchemaMissingError(error.message)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Antworten auf Reviews sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
