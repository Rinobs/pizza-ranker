import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  isReviewRepliesSchemaMissingError,
  isValidReviewReplyId,
} from "@/lib/review-replies";
import { REVIEW_REPLIES_TABLE, getSupabaseAdminClient } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ replyId: string }> }
) {
  const { replyId } = await context.params;

  if (!isValidReviewReplyId(replyId)) {
    return NextResponse.json(
      { success: false, error: "Invalid reply id" },
      { status: 400 }
    );
  }

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
  const numericReplyId = Number(replyId);

  const existingResult = await supabase
    .from(REVIEW_REPLIES_TABLE)
    .select("id, user_id, review_user_id, product_slug")
    .eq("id", numericReplyId)
    .maybeSingle();

  if (existingResult.error) {
    if (isReviewRepliesSchemaMissingError(existingResult.error.message)) {
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
      { success: false, error: existingResult.error.message },
      { status: 400 }
    );
  }

  const existing = existingResult.data as
    | {
        id: number;
        user_id: string;
        review_user_id: string;
        product_slug: string;
      }
    | null;

  if (!existing) {
    return NextResponse.json({
      success: true,
      data: { id: numericReplyId },
    });
  }

  if (existing.user_id !== userId) {
    return NextResponse.json(
      { success: false, error: "Du kannst nur deine eigenen Antworten löschen." },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from(REVIEW_REPLIES_TABLE)
    .delete()
    .eq("id", numericReplyId)
    .eq("user_id", userId);

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

  return NextResponse.json({
    success: true,
    data: {
      id: numericReplyId,
      reviewUserId: existing.review_user_id,
      productSlug: existing.product_slug,
    },
  });
}
