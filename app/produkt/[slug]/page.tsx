import { notFound } from "next/navigation";
import Star from "@/components/Star";
import { useUserRatings } from "@/hooks/useUserRatings";

export default function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const { ratings, comments, saveRating, saveComment, user } = useUserRatings();

  // Später aus DB / data laden
  const product = {
    name: params.slug.replace("-", " "),
    imageUrl: `/images/${params.slug}.jpg`,
    facts: {
      Kategorie: "Pizza",
      Marke: "Beispiel",
    },
  };

  if (!product) return notFound();

  return (
    <div className="max-w-3xl mx-auto mt-28 px-4 text-white">
      <h1 className="text-4xl font-bold mb-6">{product.name}</h1>

      <img
        src={product.imageUrl}
        className="w-full rounded-xl mb-6"
        alt={product.name}
      />

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Fakten</h2>
        <ul className="text-gray-300">
          {Object.entries(product.facts).map(([k, v]) => (
            <li key={k}>
              <strong>{k}:</strong> {v}
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
              rating={ratings[params.slug] || 0}
              index={i}
              onRate={(v) => {
                if (!user) return alert("Bitte einloggen!");
                saveRating(params.slug, v);
              }}
            />
          ))}
        </div>

        <textarea
          className="w-full bg-[#222] rounded p-2"
          placeholder="Kommentar"
          value={comments[params.slug] || ""}
          onChange={(e) => {
            if (!user) return alert("Bitte einloggen!");
            saveComment(params.slug, e.target.value);
          }}
        />
      </div>
    </div>
  );
}
