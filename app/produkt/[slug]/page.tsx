"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Star from "@/app/components/Star";
import BackButton from "@/app/components/BackButton";
import {
  ALL_PRODUCTS,
  getProductImageUrl,
  getProductRouteSlug,
} from "@/app/data/products";
import { useUserRatings } from "@/app/hooks/useUserRatings";

export default function ProductPage() {
  const { ratings, comments, saveRating, saveComment, user } = useUserRatings();
  const params = useParams<{ slug: string }>();
  const routeSlug = params?.slug;

  if (!routeSlug) return null;

  const product = ALL_PRODUCTS.find((item) => getProductRouteSlug(item) === routeSlug) ?? null;

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
        <BackButton />
        <div className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-8 text-center shadow-[0_10px_28px_rgba(0,0,0,0.26)]">
          <h1 className="text-3xl font-bold mb-4">Produkt nicht gefunden</h1>
          <Link href="/" className="text-[#8AF5AC] hover:text-[#CFFFE0] underline">
            Zurueck zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  const originalImageUrl = getProductImageUrl(product);

  const facts = [
    ["Kategorie", product.category],
    product.price ? ["Preis", product.price] : null,
    typeof product.kcal === "number" ? ["Kalorien", `${product.kcal} kcal`] : null,
    typeof product.protein === "number" ? ["Protein", `${product.protein} g`] : null,
    typeof product.fat === "number" ? ["Fett", `${product.fat} g`] : null,
    typeof product.carbs === "number" ? ["Kohlenhydrate", `${product.carbs} g`] : null,
  ].filter((entry): entry is [string, string] => Array.isArray(entry));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton />

      <div className="rounded-3xl border border-[#2D3A4B] bg-[#1B222D]/95 p-5 sm:p-8 shadow-[0_14px_34px_rgba(0,0,0,0.28)]">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-7 text-[#E8F6ED]">{product.name}</h1>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8">
          <div className="group relative rounded-2xl overflow-hidden border border-[#2D3A4B] bg-[#141C27]">
            <img
              src={`/api/product-image/${routeSlug}`}
              className="w-full aspect-[4/5] object-cover transition-transform duration-500 group-hover:scale-105"
              alt={product.name}
              decoding="async"
              onError={(e) => {
                const image = e.currentTarget;
                if (image.dataset.fallbackApplied === "1") {
                  image.src = "/images/placeholders/product-default.svg";
                  return;
                }
                image.dataset.fallbackApplied = "1";
                image.src = originalImageUrl;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Fakten</h2>
              <ul className="space-y-2 text-[#C4D0DE]">
                {facts.map(([key, value]) => (
                  <li key={key} className="rounded-lg bg-[#141C27] border border-[#2D3A4B] px-3 py-2">
                    <strong className="text-white">{key}:</strong> {value}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-[#E8F6ED]">Bewerten</h2>

              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    rating={ratings[routeSlug] || 0}
                    index={i}
                    onRate={(value) => {
                      if (!user) return alert("Bitte einloggen!");
                      saveRating(routeSlug, value);
                    }}
                  />
                ))}
              </div>

              <textarea
                className="w-full bg-[#141C27] border border-[#2D3A4B] rounded-xl p-3 text-white placeholder:text-[#8CA1B8] min-h-32"
                placeholder="Kommentar"
                value={comments[routeSlug] || ""}
                onChange={(e) => {
                  if (!user) return alert("Bitte einloggen!");
                  saveComment(routeSlug, e.target.value);
                }}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}