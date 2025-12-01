'use client'

import { useState, useEffect } from "react"
import Star from "../components/Star"
import BackButton from "../components/BackButton";

export default function ChipsPage() {
  const [search, setSearch] = useState("")
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [openItem, setOpenItem] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false);

  const CHIPS = [
  { name: "Pringles Paprika" },
  { name: "Pringles Sour Cream" },
  { name: "Funny Frisch Ungarisch" },
  { name: "Funny Frisch Chipsfrisch Paprika" },
  { name: "Chio Tortillas" },
  { name: "Lorenz Crunchips Paprika" },
  { name: "Kettle Chips Sea Salt" },
  { name: "Kettle Chips Balsamic Vinegar" },
  { name: "Lays Classic" } // ← FIX!
];


  useEffect(() => {
  const r = localStorage.getItem("chips_ratings");
  const c = localStorage.getItem("chips_comments");

  if (r) setRatings(JSON.parse(r));
  if (c) setComments(JSON.parse(c));

  setLoaded(true);
}, []);


 useEffect(() => {
  if (!loaded) return; // 🚫 WICHTIG: erst speichern wenn Daten geladen sind

  localStorage.setItem("chips_ratings", JSON.stringify(ratings));
  localStorage.setItem("chips_comments", JSON.stringify(comments));
}, [ratings, comments, loaded]);

  const saveRating = (name: string, value: number) =>
    setRatings((prev) => ({ ...prev, [name]: value }))

  const saveComment = (name: string, text: string) =>
    setComments((prev) => ({ ...prev, [name]: text }))

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">

      {/* ✅ BACK BUTTON HIER! */}
      <BackButton href="/" label="← Zurück" />

      <h1 className="text-3xl font-bold text-center mb-6">🍟 Chips</h1>

      <input
        className="w-full border px-3 py-2 rounded mb-4"
        placeholder="Chips suchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="space-y-4">
        {CHIPS.filter((c) =>
          c.name.toLowerCase().includes(search.toLowerCase())
        ).map((item) => (
          <li
  key={item.name}
  className="bg-white p-4 rounded shadow cursor-pointer"
  onClick={() =>
    setOpenItem(openItem === item.name ? null : item.name)
  }
>
  <div className="flex justify-between">
    <span>{item.name}</span>

    <div
      className="flex gap-1"
      onClick={(e) => e.stopPropagation()} // ⭐ verhindert Rating-Bug
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          rating={ratings[item.name] || 0}
          index={i}
          onRate={(v) => saveRating(item.name, v)}
        />
      ))}
    </div>
  </div>


            {openItem === item.name && (
  <div
    className="mt-3 w-full"
    onClick={(e) => e.stopPropagation()}  // ⭐ WICHTIG
  >
    <textarea
      className="w-full border rounded p-2 bg-white resize-none"
      placeholder="Kommentar..."
      value={comments[item.name] || ""}
      onChange={(e) => saveComment(item.name, e.target.value)}
      rows={3}
    />
  </div>
)}

          </li>
        ))}
      </ul>
    </div>
  )
}
