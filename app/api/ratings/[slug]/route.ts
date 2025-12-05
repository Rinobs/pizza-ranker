import { supabase } from "@/lib/supabase";

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params; // <-- WICHTIG!

  const { data, error } = await supabase
    .from("ratings")
    .select("*")
    .eq("product_slug", slug)
    .order("created_at", { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }

  return new Response(JSON.stringify({ ratings: data }), {
    status: 200,
  });
}
