import { NextResponse } from "next/server";
import {
  getImportedCatalogProducts,
} from "@/lib/imported-products";
import {
  isCategoryFilter,
  type CategoryNavigationItem,
} from "@/lib/product-navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawCategory = searchParams.get("category");
  const categorySlug: CategoryNavigationItem["slug"] | null = isCategoryFilter(
    rawCategory
  )
    ? rawCategory
    : null;

  const importedProducts = await getImportedCatalogProducts({
    categorySlug,
    limit: 2000,
  });

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
