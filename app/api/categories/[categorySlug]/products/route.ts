import { NextResponse } from "next/server";
import { getImportedCatalogProductsByCategorySlug } from "@/lib/imported-products";
import {
  isCategoryFilter,
  type CategoryNavigationItem,
} from "@/lib/product-navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ categorySlug: string }> }
) {
  const { categorySlug: rawCategorySlug } = await context.params;
  const categorySlug: CategoryNavigationItem["slug"] | null = isCategoryFilter(
    rawCategorySlug
  )
    ? rawCategorySlug
    : null;

  if (!categorySlug) {
    return NextResponse.json(
      { success: false, error: "Ungültige Kategorie." },
      { status: 400 }
    );
  }

  const importedProducts = await getImportedCatalogProductsByCategorySlug(
    categorySlug
  );

  return NextResponse.json(
    {
      success: true,
      data: importedProducts,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
