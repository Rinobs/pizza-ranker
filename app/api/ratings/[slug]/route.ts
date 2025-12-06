import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { supabase } from "@/lib/supabase";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// -------------------------------------------------------------
// POST /api/ratings/:slug
// Speichert oder updated ein Rating vom eingeloggten User
// -------------------------------------------------------------
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Not authenticated" },
      { status: 401 }
    );
  }

  const { slug } = params;
  const body = await req.json();

  const rating = Number(body.rating) || 0;
  const comment = body.comment || "";

  // User ID als stabile Kennung
  const userId = session.user.email;

  // SUPABASE UPSERT
  const { data, error } = await supabase
    .from("ratings")
    .upsert(
      {
        user_id: userId,
        product_slug: slug,
        rating,
        comment,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,product_slug",
      }
    )
    .select();

  if (error) {
    console.error("Supabase Fehler:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
