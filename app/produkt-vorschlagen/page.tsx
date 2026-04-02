"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import BackButton from "@/app/components/BackButton";
import {
  CATEGORY_NAV_ITEMS,
  getCategoryNavigationItem,
  isCategoryFilter,
} from "@/lib/product-navigation";

type SubmissionResponse = {
  success: boolean;
  data?: {
    id?: string;
  };
  error?: string;
};

const OTHER_CATEGORY_VALUE = "__other";
const MAX_NOTES_LENGTH = 1000;

function normalizeNamePrefill(value: string | null) {
  if (!value) {
    return "";
  }

  return decodeURIComponent(value).replace(/-/g, " ").trim().slice(0, 120);
}

function getCategoryPrefill(value: string | null) {
  if (!value) {
    return "";
  }

  if (isCategoryFilter(value)) {
    return getCategoryNavigationItem(value)?.category ?? "";
  }

  const normalized = decodeURIComponent(value).trim().toLowerCase();
  const matched = CATEGORY_NAV_ITEMS.find(
    (item) =>
      item.category.toLowerCase() === normalized ||
      item.name.toLowerCase() === normalized ||
      item.shortName.toLowerCase() === normalized
  );

  return matched?.category ?? "";
}

export default function ProductSuggestionPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-4 pb-24 text-white sm:px-8 lg:px-12">
          <BackButton />
          <div className="rounded-[30px] border border-[#2A394B] bg-[#111925]/92 p-6 text-sm text-[#AFC1D3]">
            Formular wird geladen...
          </div>
        </main>
      }
    >
      <ProductSuggestionPageContent />
    </Suspense>
  );
}

function ProductSuggestionPageContent() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const initialProductName = useMemo(
    () => normalizeNamePrefill(searchParams.get("name")),
    [searchParams]
  );
  const initialCategory = useMemo(
    () => getCategoryPrefill(searchParams.get("category")),
    [searchParams]
  );

  const [productName, setProductName] = useState(initialProductName);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState(initialCategory || "");
  const [customCategory, setCustomCategory] = useState("");
  const [contactEmail, setContactEmail] = useState(session?.user?.email ?? "");
  const [barcode, setBarcode] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLoggedIn = Boolean(session?.user?.email);
  const showCustomCategory = category === OTHER_CATEGORY_VALUE;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const finalCategory = showCustomCategory ? customCategory.trim() : category.trim();

    try {
      const response = await fetch("/api/product-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productName,
          brand,
          category: finalCategory,
          contactEmail,
          barcode,
          productUrl,
          imageUrl,
          notes,
        }),
      });

      const json = (await response.json()) as SubmissionResponse;

      if (!response.ok || !json.success) {
        setError(json.error || "Produktvorschlag konnte nicht gesendet werden.");
        return;
      }

      setSuccess(
        "Danke, dein Produktvorschlag ist angekommen. Mit Barcode oder Shop-Link können wir ihn besonders schnell prüfen."
      );
      setBrand("");
      setBarcode("");
      setProductUrl("");
      setImageUrl("");
      setNotes("");
      if (showCustomCategory) {
        setCustomCategory("");
      }
    } catch {
      setError("Produktvorschlag konnte nicht gesendet werden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 text-white sm:px-8 lg:px-12">
      <BackButton />

      <section className="overflow-hidden rounded-[34px] border border-[#314258] bg-[radial-gradient(circle_at_top_left,rgba(94,226,135,0.16),rgba(9,14,21,0.98)_40%),linear-gradient(145deg,rgba(18,26,38,0.99),rgba(8,12,18,0.97))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#9CC9AE]">
          Produkt fehlt im Katalog?
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#F6FFF8] sm:text-4xl">
          Neues Produkt vorschlagen oder selbst einreichen
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#C9D8E7] sm:text-base">
          Wenn du etwas suchst und es noch nicht bei FoodRanker auftaucht, kannst du es hier
          direkt einreichen. Name, Kategorie und am besten ein Link oder Barcode reichen schon.
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D6E2EF]">
          <span className="rounded-full border border-[#35503D] bg-[#173023] px-3 py-1.5 text-[#D9FFE6]">
            Direkt aus Such-Empty-State erreichbar
          </span>
          <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5">
            Shop-Link oder Barcode hilft
          </span>
          <span className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5">
            {isLoggedIn ? "Mit deinem Account verknüpft" : "Auch ohne Login möglich"}
          </span>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[30px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(19,27,38,0.96),rgba(12,18,27,0.98))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)] sm:p-6"
        >
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-white">Produktname</span>
              <input
                type="text"
                value={productName}
                maxLength={120}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="z. B. High Protein Pizza Salami"
                className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-white">Marke</span>
              <input
                type="text"
                value={brand}
                maxLength={80}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="z. B. Dr. Oetker, ESN, More"
                className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-white">Kategorie</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors focus:border-[#5EE287]"
                required
              >
                <option value="" disabled>
                  Bitte wählen
                </option>
                {CATEGORY_NAV_ITEMS.map((item) => (
                  <option key={item.slug} value={item.category}>
                    {item.shortName}
                  </option>
                ))}
                <option value={OTHER_CATEGORY_VALUE}>Andere Kategorie</option>
              </select>
            </label>

            {showCustomCategory ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-white">Eigene Kategorie</span>
                <input
                  type="text"
                  value={customCategory}
                  maxLength={60}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  placeholder="z. B. Getränke, Joghurt, Soßen"
                  className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                  required
                />
              </label>
            ) : null}

            {!isLoggedIn ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-white">Kontakt-E-Mail</span>
                <input
                  type="email"
                  value={contactEmail}
                  maxLength={160}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="damit wir bei Rückfragen schreiben können"
                  className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                  required
                />
              </label>
            ) : (
              <div className="rounded-2xl border border-[#2D5B41] bg-[#173023] px-4 py-3 text-sm text-[#D9FFE6]">
                Du reichst dieses Produkt mit deinem Account ein.
                {sessionStatus !== "loading" && session?.user?.email ? (
                  <span className="ml-1 text-[#BEEFD0]">Kontakt: {session.user.email}</span>
                ) : null}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-white">Barcode</span>
                <input
                  type="text"
                  value={barcode}
                  maxLength={64}
                  onChange={(event) => setBarcode(event.target.value)}
                  placeholder="EAN / Strichcode"
                  className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-white">Produktlink</span>
                <input
                  type="url"
                  value={productUrl}
                  maxLength={500}
                  onChange={(event) => setProductUrl(event.target.value)}
                  placeholder="https://..."
                  className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-white">Bildlink</span>
              <input
                type="url"
                value={imageUrl}
                maxLength={500}
                onChange={(event) => setImageUrl(event.target.value)}
                placeholder="optional: offizielles Produktbild"
                className="min-h-12 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-white">Hinweise</span>
              <textarea
                value={notes}
                maxLength={MAX_NOTES_LENGTH}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="z. B. Sorte, Geschmack, wo du es gefunden hast oder warum es in die App sollte"
                className="min-h-36 rounded-2xl border border-[#2D3A4B] bg-[#0F1621] px-4 py-3 text-white outline-none transition-colors placeholder:text-[#7F93A8] focus:border-[#5EE287]"
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#8CA1B8]">{notes.length}/{MAX_NOTES_LENGTH} Zeichen</p>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#5EE287] px-5 py-3 font-semibold text-[#0C1910] transition-colors hover:bg-[#79F29C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Wird gesendet..." : "Produkt einreichen"}
              </button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#6A3434] bg-[#2A1313] px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-[#2D5B41] bg-[#173023] px-4 py-3 text-sm text-[#D9FFE6]">
                {success}
              </div>
            ) : null}
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-[#2A394B] bg-[linear-gradient(145deg,rgba(19,27,38,0.96),rgba(12,18,27,0.98))] p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">Am schnellsten prüfen wir</h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#AFC1D3]">
              <li>Produktname plus Marke</li>
              <li>Barcode oder offizieller Shop-Link</li>
              <li>Die richtige Kategorie</li>
              <li>Optional ein Bildlink oder kurzer Hinweis</li>
            </ul>
          </div>

          <div className="rounded-[30px] border border-[#2A394B] bg-[#101822]/92 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">Schon versucht zu suchen?</h2>
            <p className="mt-3 text-sm leading-relaxed text-[#AFC1D3]">
              Oft hilft eine Marke, Sorte oder Kategorie wie `Pizza`, `Vanille` oder
              `Proteinriegel`, bevor du ein neues Produkt einreichst.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#2D3A4B] bg-[#141C27] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#5EE287] hover:text-[#D9FFE6]"
            >
              Zur Suche zurück
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
