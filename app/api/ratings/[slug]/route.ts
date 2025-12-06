import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { rating } = await req.json();

  const { data, error } = await supabase.from("ratings").upsert({
    user_email: session.user?.email,
    product_slug: params.slug,
    rating: rating,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true, data });
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ rating: 0 });
  }

  const { data } = await supabase
    .from("ratings")
    .select("rating")
    .eq("user_email", session.user?.email)
    .eq("product_slug", params.slug)
    .maybeSingle();

  return NextResponse.json({ rating: data?.rating ?? 0 });
}
