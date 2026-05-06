import { NextResponse } from "next/server";
import { getSupabaseAdminClient, IMPORTED_PRODUCTS_TABLE } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Datenbankverbindung nicht verfügbar." },
      { status: 503 }
    );
  }

  const { data: toDelete, error: selectError } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select("route_slug, name, source_id")
    .or("image_url.is.null,image_url.eq.");

  if (selectError) {
    return NextResponse.json(
      { success: false, error: selectError.message },
      { status: 500 }
    );
  }

  const count = Array.isArray(toDelete) ? toDelete.length : 0;

  if (count === 0) {
    return NextResponse.json({ success: true, deleted: 0, message: "Keine Produkte ohne Bild gefunden." });
  }

  const { error: deleteError } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .delete()
    .or("image_url.is.null,image_url.eq.");

  if (deleteError) {
    return NextResponse.json(
      { success: false, error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    deleted: count,
    message: `${count} Produkt${count !== 1 ? "e" : ""} ohne Bild wurden entfernt.`,
  });
}

export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Datenbankverbindung nicht verfügbar." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from(IMPORTED_PRODUCTS_TABLE)
    .select("route_slug, name, source_id, image_url")
    .or("image_url.is.null,image_url.eq.")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const count = Array.isArray(data) ? data.length : 0;

  return NextResponse.json({
    success: true,
    count,
    products: data ?? [],
  });
}
