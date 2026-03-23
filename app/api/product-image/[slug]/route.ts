import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import {
  ALL_PRODUCTS,
  DEFAULT_PRODUCT_IMAGE,
  getProductImageFetchUrl,
  getProductImageUrl,
  getProductRouteSlug,
} from "@/app/data/products";

export const runtime = "nodejs";

const CACHE_DIR = path.join(process.cwd(), "public", "image-cache");
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage
const PRODUCT_BY_ROUTE_SLUG = new Map(
  ALL_PRODUCTS.map((product) => [getProductRouteSlug(product), product] as const)
);
const IN_FLIGHT_IMAGE_FETCHES = new Map<
  string,
  Promise<{ contentType: string; imageData: Buffer }>
>();

function getCachePaths(slug: string) {
  return {
    imagePath: path.join(CACHE_DIR, `${slug}.bin`),
    metaPath: path.join(CACHE_DIR, `${slug}.json`),
  };
}

function imageResponse(
  data: Buffer,
  contentType: string,
  cacheState: "HIT" | "MISS"
) {
  const body = Uint8Array.from(data).buffer;

  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}, stale-while-revalidate=86400`,
      "X-Image-Cache": cacheState,
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "ungültiger slug" }, { status: 400 });
  }

  const product = PRODUCT_BY_ROUTE_SLUG.get(slug);

  if (!product) {
    return NextResponse.json({ error: "produkt nicht gefunden" }, { status: 404 });
  }

  const sourceUrl = getProductImageFetchUrl(product);

  if (sourceUrl.startsWith("/")) {
    return NextResponse.redirect(new URL(sourceUrl, request.url), 307);
  }

  const { imagePath, metaPath } = getCachePaths(slug);

  try {
    const [cachedImage, cachedMetaRaw] = await Promise.all([
      fs.readFile(imagePath),
      fs.readFile(metaPath, "utf8"),
    ]);

    const cachedMeta = JSON.parse(cachedMetaRaw) as {
      contentType?: string;
      sourceUrl?: string;
    };

    if (!cachedMeta.sourceUrl || cachedMeta.sourceUrl === sourceUrl) {
      return imageResponse(cachedImage, cachedMeta.contentType || "image/jpeg", "HIT");
    }
  } catch {
    // Cache miss: wir laden das Bild und speichern es lokal.
  }

  let pendingFetch = IN_FLIGHT_IMAGE_FETCHES.get(slug);

  if (!pendingFetch) {
    pendingFetch = (async () => {
      const upstream = await fetch(sourceUrl, {
        next: { revalidate: CACHE_MAX_AGE_SECONDS },
      });

      if (!upstream.ok) {
        throw new Error(`upstream image request failed with status ${upstream.status}`);
      }

      const contentType =
        upstream.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const imageData = Buffer.from(await upstream.arrayBuffer());

      await fs.mkdir(CACHE_DIR, { recursive: true });
      await Promise.all([
        fs.writeFile(imagePath, imageData),
        fs.writeFile(
          metaPath,
          JSON.stringify(
            {
              contentType,
              sourceUrl,
              originalSourceUrl: getProductImageUrl(product),
              cachedAt: new Date().toISOString(),
            },
            null,
            2
          ),
          "utf8"
        ),
      ]);

      return { contentType, imageData };
    })();

    IN_FLIGHT_IMAGE_FETCHES.set(slug, pendingFetch);
  }

  try {
    const { contentType, imageData } = await pendingFetch;
    return imageResponse(imageData, contentType, "MISS");
  } catch {
    return NextResponse.redirect(new URL(DEFAULT_PRODUCT_IMAGE, request.url), 307);
  } finally {
    if (IN_FLIGHT_IMAGE_FETCHES.get(slug) === pendingFetch) {
      IN_FLIGHT_IMAGE_FETCHES.delete(slug);
    }
  }
}

