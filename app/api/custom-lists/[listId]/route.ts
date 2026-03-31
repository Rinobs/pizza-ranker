import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  isCustomListSchemaMissingError,
} from "@/lib/custom-lists";
import {
  USER_CUSTOM_LISTS_TABLE,
  getSupabaseAdminClient,
} from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export async function DELETE(
  _request: Request,
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

  const userId = getStableUserId(userEmail);
  const { error } = await supabase
    .from(USER_CUSTOM_LISTS_TABLE)
    .delete()
    .eq("id", listId)
    .eq("user_id", userId);

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

  return NextResponse.json({
    success: true,
    data: {
      listId,
    },
  });
}
