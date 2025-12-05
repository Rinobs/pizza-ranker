import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";

// ❗ Kein authOptions importieren!

export async function POST(req: Request) {
  const session = await getServerSession(); // funktioniert ohne Parameter!

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { productSlug, rating, comment } = body;

  const { data, error } = await supabase
    .from("ratings")
    .insert({
      user_email: session.user?.email,
      product_slug: productSlug,
      rating,
      comment,
    });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}
