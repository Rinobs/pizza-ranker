import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  isProductSubmissionsSchemaMissingError,
  normalizeProductSubmissionBarcode,
  normalizeProductSubmissionEmail,
  normalizeProductSubmissionText,
  normalizeProductSubmissionUrl,
} from "@/lib/product-submissions";
import { PRODUCT_SUBMISSIONS_TABLE, getSupabaseAdminClient } from "@/lib/supabase";
import { getStableUserId } from "@/lib/user-id";

const MAX_NAME_LENGTH = 120;
const MAX_BRAND_LENGTH = 80;
const MAX_CATEGORY_LENGTH = 60;
const MAX_NOTES_LENGTH = 1000;

type SubmissionBody = {
  productName?: unknown;
  brand?: unknown;
  category?: unknown;
  contactEmail?: unknown;
  barcode?: unknown;
  productUrl?: unknown;
  imageUrl?: unknown;
  notes?: unknown;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email?.trim().toLowerCase() ?? null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured" },
      { status: 500 }
    );
  }

  let body: SubmissionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const productName = normalizeProductSubmissionText(body.productName, MAX_NAME_LENGTH);
  const brand = normalizeProductSubmissionText(body.brand, MAX_BRAND_LENGTH);
  const category = normalizeProductSubmissionText(body.category, MAX_CATEGORY_LENGTH);
  const contactEmail = userEmail ?? normalizeProductSubmissionEmail(body.contactEmail);
  const barcode = normalizeProductSubmissionBarcode(body.barcode);
  const productUrl = normalizeProductSubmissionUrl(body.productUrl);
  const imageUrl = normalizeProductSubmissionUrl(body.imageUrl);
  const notes = normalizeProductSubmissionText(body.notes, MAX_NOTES_LENGTH);

  if (productName.length < 2) {
    return NextResponse.json(
      { success: false, error: "Bitte gib einen Produktnamen mit mindestens 2 Zeichen an." },
      { status: 400 }
    );
  }

  if (category.length < 2) {
    return NextResponse.json(
      { success: false, error: "Bitte wähle eine Kategorie oder trage eine passende ein." },
      { status: 400 }
    );
  }

  if (!contactEmail) {
    return NextResponse.json(
      {
        success: false,
        error: "Bitte hinterlege eine Kontakt-E-Mail oder logge dich zuerst ein.",
      },
      { status: 400 }
    );
  }

  if (typeof body.productUrl === "string" && body.productUrl.trim().length > 0 && !productUrl) {
    return NextResponse.json(
      { success: false, error: "Der Produktlink muss mit http:// oder https:// beginnen." },
      { status: 400 }
    );
  }

  if (typeof body.imageUrl === "string" && body.imageUrl.trim().length > 0 && !imageUrl) {
    return NextResponse.json(
      { success: false, error: "Der Bildlink muss mit http:// oder https:// beginnen." },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const userId = userEmail ? getStableUserId(userEmail) : null;

  const { data, error } = await supabase
    .from(PRODUCT_SUBMISSIONS_TABLE)
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      contact_email: contactEmail,
      product_name: productName,
      brand: brand || null,
      category,
      barcode: barcode || null,
      product_url: productUrl,
      image_url: imageUrl,
      notes: notes || null,
      status: "open",
      inserted_at: now,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error) {
    if (isProductSubmissionsSchemaMissingError(error.message)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Produktvorschläge sind noch nicht in Supabase eingerichtet. Bitte spiele das neue Schema ein.",
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
    data,
  });
}
