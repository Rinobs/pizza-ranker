console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SERVICE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "YES" : "NO");

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

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
