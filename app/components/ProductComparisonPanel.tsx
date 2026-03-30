"use client";

import Link from "next/link";
import BuyButton from "@/app/components/BuyButton";
import { getProductBuyLink, type Product } from "@/app/data/products";

export type ComparableProduct = {
  item: Product;
  name: string;
  routeSlug: string;
  originalImageUrl: string;
  ratingAvg: number | null;
  ratingCount: number;
};

export const COMPARE_LIMIT = 3;

type ComparisonDirection = "higher" | "lower";

type CompareMetric = {
  key: string;
  label: string;
  getDisplayValue: (product: ComparableProduct) => string;
  getNumericValue?: (product: ComparableProduct) => number | null;
  better?: ComparisonDirection;
};

type ProductComparisonPanelProps = {
  title: string;
  products: ComparableProduct[];
  limit: number;
  onRemove: (routeSlug: string) => void;
  onClear: () => void;
};

const DECIMAL_FORMATTER = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

function formatDecimal(value: number) {
  return DECIMAL_FORMATTER.format(value);
}

function formatRating(product: ComparableProduct) {
  if (product.ratingAvg === null || product.ratingCount === 0) {
    return "Noch keine Bewertung";
  }

  return `${formatDecimal(product.ratingAvg)} / 5 (${product.ratingCount})`;
}

function formatNumberWithUnit(value: number | undefined, unit: string) {
  return typeof value === "number" ? `${formatDecimal(value)} ${unit}` : "Keine Angabe";
}

function getWinningProductIndexes(products: ComparableProduct[], metric: CompareMetric) {
  if (!metric.getNumericValue || !metric.better) {
    return new Set<number>();
  }

  const numericValues: Array<[index: number, value: number]> = [];

  products.forEach((product, index) => {
    const value = metric.getNumericValue?.(product);
    if (typeof value === "number" && Number.isFinite(value)) {
      numericValues.push([index, value]);
    }
  });

  if (numericValues.length < 2) {
    return new Set<number>();
  }

  const distinctValues = new Set(
    numericValues.map(([, value]) => value.toFixed(4))
  );

  if (distinctValues.size < 2) {
    return new Set<number>();
  }

  const bestValue =
    metric.better === "higher"
      ? Math.max(...numericValues.map(([, value]) => value))
      : Math.min(...numericValues.map(([, value]) => value));

  return new Set(
    numericValues
      .filter(([, value]) => Math.abs(value - bestValue) < 0.0001)
      .map(([index]) => index)
  );
}

function getQuickFacts(product: ComparableProduct) {
  return [
    product.item.price?.trim() || null,
    typeof product.item.kcal === "number" ? `${formatDecimal(product.item.kcal)} kcal` : null,
    typeof product.item.protein === "number"
      ? `${formatDecimal(product.item.protein)} g Protein`
      : null,
  ].filter((fact): fact is string => Boolean(fact));
}

const COMPARE_METRICS: CompareMetric[] = [
  {
    key: "rating",
    label: "Bewertung",
    getDisplayValue: (product) => formatRating(product),
    getNumericValue: (product) =>
      product.ratingCount > 0 && product.ratingAvg !== null ? product.ratingAvg : null,
    better: "higher",
  },
  {
    key: "price",
    label: "Preis",
    getDisplayValue: (product) => product.item.price?.trim() || "Keine Angabe",
  },
  {
    key: "kcal",
    label: "Kalorien",
    getDisplayValue: (product) => formatNumberWithUnit(product.item.kcal, "kcal"),
    getNumericValue: (product) =>
      typeof product.item.kcal === "number" ? product.item.kcal : null,
    better: "lower",
  },
  {
    key: "protein",
    label: "Protein",
    getDisplayValue: (product) => formatNumberWithUnit(product.item.protein, "g"),
    getNumericValue: (product) =>
      typeof product.item.protein === "number" ? product.item.protein : null,
    better: "higher",
  },
  {
    key: "fat",
    label: "Fett",
    getDisplayValue: (product) => formatNumberWithUnit(product.item.fat, "g"),
    getNumericValue: (product) =>
      typeof product.item.fat === "number" ? product.item.fat : null,
    better: "lower",
  },
  {
    key: "carbs",
    label: "Kohlenhydrate",
    getDisplayValue: (product) => formatNumberWithUnit(product.item.carbs, "g"),
    getNumericValue: (product) =>
      typeof product.item.carbs === "number" ? product.item.carbs : null,
    better: "lower",
  },
];

export default function ProductComparisonPanel({
  title,
  products,
  limit,
  onRemove,
  onClear,
}: ProductComparisonPanelProps) {
  if (products.length === 0) {
    return null;
  }

  const comparisonReady = products.length >= 2;

  return (
    <section className="mb-8 rounded-[28px] border border-[#2D3A4B] bg-[linear-gradient(135deg,rgba(15,24,34,0.98),rgba(19,30,43,0.96))] p-5 sm:p-6 shadow-[0_18px_42px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#8CA1B8]">Produktvergleich</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#E8F6ED]">
            {comparisonReady
              ? `${products.length} Produkte im Direktvergleich`
              : "Wähle noch ein Produkt für den Vergleich aus"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[#8CA1B8]">
            {comparisonReady
              ? "Bewertung, Preis und Makros liegen direkt nebeneinander, damit du schneller entscheiden kannst."
              : `Du kannst bis zu ${limit} Produkte aus ${title} auswählen und direkt gegenüberstellen.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#35506D] bg-[#122233] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#D9ECFF]">
            {products.length}/{limit} ausgewählt
          </span>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-[#2D3A4B] bg-[#141C27] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#C4D0DE] transition-colors hover:border-[#5EE287] hover:text-white"
          >
            Auswahl leeren
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const quickFacts = getQuickFacts(product);
          const buyLink = getProductBuyLink(product.item);

          return (
            <article
              key={product.routeSlug}
              className="rounded-2xl border border-[#2D3A4B] bg-[#141C27]/90 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#2D3A4B] bg-[#101822] p-1.5">
                  <img
                    src={`/api/product-image/${product.routeSlug}`}
                    alt={product.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      const image = event.currentTarget;
                      if (image.dataset.fallbackApplied === "1") {
                        image.src = "/images/placeholders/product-default.svg";
                        return;
                      }

                      image.dataset.fallbackApplied = "1";
                      image.src = product.originalImageUrl;
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold leading-snug text-[#E8F6ED]">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs text-[#BFD0E2]">{formatRating(product)}</p>

                  {quickFacts.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {quickFacts.map((fact) => (
                        <span
                          key={`${product.routeSlug}-${fact}`}
                          className="rounded-full border border-[#2D3A4B] bg-[#101822] px-2.5 py-1 text-[11px] font-medium text-[#C4D0DE]"
                        >
                          {fact}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/produkt/${product.routeSlug}`}
                    className="text-sm font-semibold text-[#8AF5AC] transition-colors hover:text-[#CFFFE0]"
                  >
                    Zum Produkt
                  </Link>
                  <BuyButton
                    href={buyLink.url}
                    sourceLabel={buyLink.sourceLabel}
                    productName={product.name}
                    compact
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(product.routeSlug)}
                  className="rounded-full border border-[#5A2A2A] bg-[#2A1111] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-red-200 transition-colors hover:bg-[#3A1717]"
                >
                  Entfernen
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {!comparisonReady ? (
        <p className="mt-4 rounded-2xl border border-[#2D3A4B] bg-[#111923] px-4 py-3 text-sm text-[#8CA1B8]">
          Wähle noch ein weiteres Produkt aus {title}, dann erscheint hier der direkte Vergleich.
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[720px] w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 min-w-40 rounded-tl-2xl border border-[#2D3A4B] bg-[#0F1822] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#8CA1B8]">
                    Merkmal
                  </th>
                  {products.map((product, index) => (
                    <th
                      key={product.routeSlug}
                      className={`min-w-56 border border-[#2D3A4B] bg-[#0F1822] px-4 py-3 text-left text-sm font-semibold text-[#E8F6ED] ${
                        index === products.length - 1 ? "rounded-tr-2xl" : ""
                      }`}
                    >
                      {product.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map((metric, metricIndex) => {
                  const winningIndexes = getWinningProductIndexes(products, metric);
                  const isLastRow = metricIndex === COMPARE_METRICS.length - 1;

                  return (
                    <tr key={metric.key}>
                      <th
                        scope="row"
                        className={`sticky left-0 z-10 border border-[#2D3A4B] bg-[#111923] px-4 py-3 text-left text-sm font-semibold text-[#E8F6ED] ${
                          isLastRow ? "rounded-bl-2xl" : ""
                        }`}
                      >
                        {metric.label}
                      </th>

                      {products.map((product, index) => {
                        const isHighlighted = winningIndexes.has(index);
                        const isLastColumn = index === products.length - 1;

                        return (
                          <td
                            key={`${metric.key}-${product.routeSlug}`}
                            className={`border border-[#2D3A4B] px-4 py-3 text-sm ${
                              isHighlighted
                                ? "bg-[#173023] font-semibold text-[#E8F6ED]"
                                : "bg-[#141C27] text-[#C4D0DE]"
                            } ${isLastRow && isLastColumn ? "rounded-br-2xl" : ""}`}
                          >
                            {metric.getDisplayValue(product)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#8CA1B8]">
            Grün markiert: bester Wert innerhalb deiner Auswahl. Bei Kalorien, Fett und
            Kohlenhydraten ist der niedrigere Wert markiert.
          </p>
        </>
      )}
    </section>
  );
}
