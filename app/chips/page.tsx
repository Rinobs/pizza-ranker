"use client";

import { useState, useEffect } from "react";
import Star from "../components/Star";
import BackButton from "../components/BackButton";

export default function ChipsPage() {
  const [search, setSearch] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("chips_ratings");
    return stored ? JSON.parse(stored) : {};
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    const stored = localStorage.getItem("chips_comments");
    return stored ? JSON.parse(stored) : {};
  });
  const [openItem, setOpenItem] = useState<string | null>(null);

  const CHIPS = [
    { name: "Pringles Paprika" },
    { name: "Pringles Sour Cream" },
    { name: "Funny Frisch Ungarisch" },
    { name: "Funny Frisch Chipsfrisch Paprika" },
    { name: "Chio Tortillas" },
    { name: "Lorenz Crunchips Paprika" },
    { name: "Kettle Chips Sea Salt" },
    { name: "Kettle Chips Balsamic Vinegar" },
    { name: "Lays Classic" },
  ];

  useEffect(() => {
    localStorage.setItem("chips_ratings", JSON.stringify(ratings));
    localStorage.setItem("chips_comments", JSON.stringify(comments));
  }, [ratings, comments]);

  const saveRating = (name: string, value: number) =>
    setRatings((prev) => ({ ...prev, [name]: value }));

  const saveComment = (name: string, text: string) =>
    setComments((prev) => ({ ...prev, [name]: text }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 pb-24 text-white">
      <BackButton href="/" />

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#E8F6ED] mb-8">
        {"\u{1F35F}"} Chips
      </h1>

      <input
        className="w-full border border-[#2D3A4B] bg-[#1B222D] px-4 py-3 rounded-xl mb-8 text-white placeholder:text-[#8CA1B8] focus:border-[#5EE287] outline-none transition-colors"
        placeholder="Chips suchen..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="space-y-5">
        {CHIPS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
          <li
            key={item.name}
            className="rounded-2xl border border-[#2D3A4B] bg-[#1B222D] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.24)] hover:border-[#5EE287] hover:shadow-[0_12px_28px_rgba(34,197,94,0.18)] transition-all duration-300 cursor-pointer"
            onClick={() => setOpenItem(openItem === item.name ? null : item.name)}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-lg font-semibold text-[#E8F6ED]">{item.name}</span>

              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
              <div className="mt-4 w-full" onClick={(e) => e.stopPropagation()}>
                <textarea
                  className="w-full border border-[#2D3A4B] rounded-xl p-3 bg-[#141C27] text-white placeholder:text-[#8CA1B8] resize-none"
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
  );
}