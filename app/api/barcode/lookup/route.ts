import { NextResponse } from "next/server";
import {
  getImportedProductByBarcode,
  persistImportedProduct,
} from "@/lib/imported-products";
import {
  fetchOpenFoodFactsProductByBarcode,
  mapOpenFoodFactsProductToImportedDraft,
} from "@/lib/open-food-facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BarcodeLookupResponse =
  | {
      success: true;
      found: true;
      barcode: string;
      routeSlug: string;
      name: string;
      sourceUrl: string;
      manualHref: string;
    }
  | {
      success: true;
      found: false;
      barcode: string;
      manualHref: string;
    }
  | {
      success: false;
      error: string;
      barcode?: string;
      manualHref?: string;
    };

function normalizeBarcode(value: string | null) {
  return (value ?? "").replace(/[^\d]/g, "").trim();
}

function buildManualHref(barcode: string) {
  const params = new URLSearchParams({
    barcode,
    from: "barcode-scan",
  });

  return `/produkt-vorschlagen?${params.toString()}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const barcode = normalizeBarcode(searchParams.get("barcode"));

  if (barcode.length < 8 || barcode.length > 14) {
    return NextResponse.json(
      {
        success: false,
        error: "Ungueltiger Barcode.",
      } satisfies BarcodeLookupResponse,
      {
        status: 400,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const manualHref = buildManualHref(barcode);
  const importedProduct = await getImportedProductByBarcode(barcode);

  if (importedProduct) {
    return NextResponse.json(
      {
        success: true,
        found: true,
        barcode,
        routeSlug: importedProduct.routeSlug,
        name: importedProduct.name,
        sourceUrl: importedProduct.sourceUrl,
        manualHref,
      } satisfies BarcodeLookupResponse,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const offProduct = await fetchOpenFoodFactsProductByBarcode(barcode);

  if (!offProduct) {
    return NextResponse.json(
      {
        success: true,
        found: false,
        barcode,
        manualHref,
      } satisfies BarcodeLookupResponse,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const importedDraft = mapOpenFoodFactsProductToImportedDraft(offProduct, {
    barcodeOverride: barcode,
  });

  if (!importedDraft) {
    return NextResponse.json(
      {
        success: true,
        found: false,
        barcode,
        manualHref,
      } satisfies BarcodeLookupResponse,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const persistedProduct = (await persistImportedProduct(importedDraft)) ?? importedDraft;

  return NextResponse.json(
    {
      success: true,
      found: true,
      barcode,
      routeSlug: persistedProduct.routeSlug,
      name: persistedProduct.name,
      sourceUrl: persistedProduct.sourceUrl,
      manualHref,
    } satisfies BarcodeLookupResponse,
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
