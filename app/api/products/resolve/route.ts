import { NextRequest, NextResponse } from "next/server";
import { resolveProductSummariesByRouteSlug } from "@/lib/imported-products";

const PRODUCT_SLUG_PATTERN = /^[a-z0-9-]+$/;
const MAX_ROUTE_SLUGS = 2000;

type ResolveProductsRequest = {
  routeSlugs?: unknown;
};

export async function POST(req: NextRequest) {
  let body: ResolveProductsRequest;

  try {
    body = (await req.json()) as ResolveProductsRequest;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const routeSlugs = Array.isArray(body.routeSlugs)
    ? Array.from(
        new Set(
          body.routeSlugs
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter((value) => PRODUCT_SLUG_PATTERN.test(value))
        )
      )
    : [];

  if (routeSlugs.length > MAX_ROUTE_SLUGS) {
    return NextResponse.json(
      {
        success: false,
        error: `Zu viele Produkte auf einmal. Maximal ${MAX_ROUTE_SLUGS} erlaubt.`,
      },
      { status: 400 }
    );
  }

  if (routeSlugs.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
    });
  }

  const resolvedProducts = await resolveProductSummariesByRouteSlug(routeSlugs);

  return NextResponse.json({
    success: true,
    data: routeSlugs
      .map((routeSlug) => resolvedProducts.get(routeSlug))
      .filter((product): product is NonNullable<typeof product> => Boolean(product)),
  });
}
