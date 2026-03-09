import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdminClient, RATINGS_TABLE } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

export async function GET() {
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

  const { data, error } = await supabase
    .from(RATINGS_TABLE)
    .select("product_slug, rating, comment, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  const ratings = data ?? [];
  return NextResponse.json({ success: true, data: ratings, ratings });
}
