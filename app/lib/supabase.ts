import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

async function saveRating(productSlug: string, rating: number, comment: string) {
  const supabase = supabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return alert("Bitte zuerst einloggen!");

  await supabase
    .from("ratings")
    .upsert({
      user_id: user.id,
      product_slug: productSlug,
      rating,
      comment
    });
}
async function loadRating(productSlug: string) {
  const supabase = supabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("ratings")
    .select("*")
    .eq("user_id", user.id)
    .eq("product_slug", productSlug)
    .single();

  return data;
}

export function supabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
