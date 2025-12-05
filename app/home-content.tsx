"use client";

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
        
      </div>
    </main>
  );
}
