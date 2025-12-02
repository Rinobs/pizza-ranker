'use client';

import Link from "next/link";
import LoginButton from "./components/LoginButton";

export default function Home() {
  const categories = [
    { name: "🍕 Tiefkühlpizza", path: "/pizza" },
    { name: "🍟 Chips", path: "/chips" },
    { name: "🍫 Süßigkeiten", path: "/sweets" },
    { name: "🍝 Tiefkühlgerichte", path: "/frozen-food" },
    { name: "🥤 Getränke", path: "/drinks" },
    { name: "🍨 Eis", path: "/icecream" },
  ];

  return (
    <div className="max-w-xl mx-auto mt-8 px-4 text-center">

      {/* ⭐ Login Button oben */}
      <div className="mb-6 flex justify-center">
        <LoginButton />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-red-600 mb-6">
        Food Ranker 🍽️
      </h1>

      <p className="text-gray-600 mb-8">
        Wähle eine Kategorie aus und bewerte deine Favoriten!
      </p>

      {/* Kategorien */}
      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => (
          <Link
            key={cat.path}
            href={cat.path}
            className="block bg-white p-4 rounded-xl shadow hover:shadow-lg transition text-lg font-medium border cursor-pointer"
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
