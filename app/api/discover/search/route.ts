import { NextResponse } from "next/server";
import {
  searchImportedProducts,
  type ImportedProductSearchResult,
} from "@/lib/imported-products";
import {
  searchOpenFoodFactsProducts,
  type ImportedProductSearchSuggestion,
} from "@/lib/open-food-facts";
import { isCategoryFilter, type CategoryNavigationItem } from "@/lib/product-navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DiscoverSearchResponse = {
  success: boolean;
  source: "database" | "open_food_facts" | "none";
  suggestions: Array<{
    routeSlug: string;
    name: string;
    brand: string | null;
    category: string;
    imageUrl: string | null;
    sourceUrl: string;
    searchScore: number;
  }>;
};

function toSuggestion(
  product: ImportedProductSearchResult | ImportedProductSearchSuggestion
) {
  return {
    routeSlug: product.routeSlug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    imageUrl: product.imageUrl,
    sourceUrl: product.sourceUrl,
    searchScore: product.searchScore,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();
  const rawCategory = searchParams.get("category");
  const categorySlug: CategoryNavigationItem["slug"] | null = isCategoryFilter(rawCategory)
    ? rawCategory
    : null;

  if (query.length < 2) {
    return NextResponse.json({
      success: true,
      source: "none",
      suggestions: [],
    } satisfies DiscoverSearchResponse);
  }

  const importedProducts = await searchImportedProducts(query, {
    categorySlug,
    limit: 8,
  });

  if (importedProducts.length > 0) {
    return NextResponse.json({
      success: true,
      source: "database",
      suggestions: importedProducts.map(toSuggestion),
    } satisfies DiscoverSearchResponse, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  const offSuggestions = await searchOpenFoodFactsProducts(query, {
    preferredCategorySlug: categorySlug,
    limit: 8,
  });

  return NextResponse.json({
    success: true,
    source: offSuggestions.length > 0 ? "open_food_facts" : "none",
    suggestions: offSuggestions.map(toSuggestion),
  } satisfies DiscoverSearchResponse, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
