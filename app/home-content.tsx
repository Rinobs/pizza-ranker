"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ALL_PRODUCTS } from "./data/products";

const categories = [
  { name: "Tiefkühlpizza", icon: "🍕", slug: "pizza" },
  { name: "Chips", icon: "🍟", slug: "chips" },
  { name: "Süßigkeiten", icon: "🍬", slug: "suessigkeiten" },
  { name: "Tiefkühlgerichte", icon: "🍲", slug: "tiefkuehlgerichte" },
  { name: "Getränke", icon: "🥤", slug: "getraenke" },
  { name: "Eis", icon: "🍦", slug: "eis" },
  { name: "Proteinpulver", icon: "💪", slug: "proteinpulver" },
  { name: "Proteinriegel", icon: "🍫", slug: "proteinriegel" },
];

export default function HomeContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const showProducts = q.length > 0;

  const productResults = ALL_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(q)
  );

  const categoryResults = categories.filter((c) =>
    c.name.toLowerCase().includes(q)
  );

  return (
    <main className="min-h-screen bg-[#14181C] text-white px-6 pb-20 pt-24">
      <div className="text-center pb-10">
        <h1 className="text-5xl font-extrabold tracking-tight text-white">
          FoodRanker
        </h1>
        <p className="text-gray-400 mt-1">
          Finde und bewerte deine Lieblingsprodukte.
        </p>
      </div>

      <div
        className="
          grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
          gap-6 max-w-6xl mx-auto
        "
      >
        {showProducts
          ? productResults.map((product) => (
              <Link
                key={product.name}
                href={`/${product.slug}`}
                className="
                  group relative rounded-xl overflow-hidden cursor-pointer
                  bg-[#1A1F23] border border-[#2A3036]
                  hover:border-[#4CAF50] 
                  hover:shadow-[0_0_25px_rgba(76,175,80,0.3)]
                  transition-all
                "
                style={{ aspectRatio: "2/3" }}
              >
                <div className="w-full h-full">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                  <h3 className="text-sm font-semibold text-white drop-shadow-md">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-300">{product.category}</p>
                </div>
              </Link>
            ))
          : categoryResults.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="
                  group relative p-6 rounded-xl
                  bg-[#1A1F23] border border-[#2A3036]
                  hover:border-[#4CAF50] hover:bg-[#1F262B]
                  shadow hover:shadow-lg transition-all
                  flex flex-col items-center justify-center
                  text-center cursor-pointer
                "
              >
                <div
                  className="
                    text-5xl mb-4 transition-transform
                    group-hover:scale-110
                  "
                >
                  {cat.icon}
                </div>

                <h2
                  className="
                    text-xl font-semibold tracking-wide text-white
                    drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
                    group-hover:text-[#4CAF50] transition
                  "
                >
                  {cat.name}
                </h2>
              </Link>
            ))}
      </div>
    </main>
  );
}
