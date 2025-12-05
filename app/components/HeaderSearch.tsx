"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { FiSearch } from "react-icons/fi";
import { useEffect, useState, FormEvent } from "react";

export default function HeaderSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");

  // URL → Input spiegeln
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");

    router.push(`/?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="
        hidden sm:flex items-center gap-2
        flex-1 max-w-md mx-4
        bg-[#14181C] border border-[#2A3238]
        rounded-lg px-3 py-1.5
      "
    >
      <FiSearch className="text-gray-400" />
      <input
        type="text"
        placeholder="Produkte & Kategorien suchen…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="
          bg-transparent outline-none border-none
          text-sm text-white w-full
          placeholder:text-gray-500
        "
      />
    </form>
  );
}
