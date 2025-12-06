import { NextResponse, NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const user = session.user;
  if (!user?.email) {
    return NextResponse.json(
      { success: false, error: "Missing user email" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { rating, comment } = body;

  // UPSERT → überschreibt vorhandene Bewertung
  const { data, error } = await supabase
    .from("ratings")
    .upsert(
      {
        user_id: user.email,
        product_slug: slug,
        rating,
        comment,
      },
      { onConflict: "user_id,product_slug" }
    )
    .select();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
