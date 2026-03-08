"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import Star from "@/app/components/Star";
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

  const product =
    ALL_PRODUCTS.find((item) => getProductRouteSlug(item) === routeSlug) ?? null;

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto mt-28 px-4 text-white">
        <h1 className="text-3xl font-bold mb-4">Produkt nicht gefunden</h1>
        <Link href="/" className="text-blue-300 underline">
          Zurueck zur Startseite
        </Link>
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
    typeof product.carbs === "number"
      ? ["Kohlenhydrate", `${product.carbs} g`]
      : null,
  ].filter((entry): entry is [string, string] => Array.isArray(entry));

  return (
    <div className="max-w-3xl mx-auto mt-28 px-4 text-white">
      <h1 className="text-4xl font-bold mb-6">{product.name}</h1>

      <img
        src={`/api/product-image/${routeSlug}`}
        className="w-full rounded-xl mb-6"
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

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Fakten</h2>
        <ul className="text-gray-300">
          {facts.map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {value}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Bewerten</h2>

        <div className="flex gap-1 mb-3">
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
          className="w-full bg-[#222] rounded p-2"
          placeholder="Kommentar"
          value={comments[routeSlug] || ""}
          onChange={(e) => {
            if (!user) return alert("Bitte einloggen!");
            saveComment(routeSlug, e.target.value);
          }}
        />
      </div>
    </div>
  );
}

