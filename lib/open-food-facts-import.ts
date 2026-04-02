import {
  getExistingImportedBarcodes,
  persistImportedProduct,
} from "@/lib/imported-products";
import {
  fetchOpenFoodFactsProductsByCategoryTag,
  hasCompleteOpenFoodFactsNutriments,
  hasOpenFoodFactsImage,
  mapOpenFoodFactsProductToImportedDraft,
} from "@/lib/open-food-facts";
import type { CategoryNavigationItem } from "@/lib/product-navigation";

const MAX_IMPORTS_PER_CATEGORY = 200;
const SEARCH_PAGE_SIZE = 200;
const MAX_PAGES_PER_CATEGORY = 10;
const MIN_SEARCH_REQUEST_INTERVAL_MS = 6500;

export type OpenFoodFactsImportCategory = {
  tag: string;
  label: string;
  category: string;
  categorySlug: CategoryNavigationItem["slug"] | null;
};

export type OpenFoodFactsImportProgressEvent =
  | {
      type: "start";
      totalCategories: number;
      maxImportsPerCategory: number;
      totalTargetImports: number;
    }
  | {
      type: "progress";
      percent: number;
      currentCategoryTag: string;
      currentCategoryLabel: string;
      currentCategoryIndex: number;
      totalCategories: number;
      categoryImported: number;
      categorySkipped: number;
      categoryErrors: number;
      imported: number;
      skipped: number;
      errors: number;
      message: string;
    }
  | {
      type: "summary";
      percent: 100;
      imported: number;
      skipped: number;
      errors: number;
      categories: Array<{
        tag: string;
        label: string;
        imported: number;
        skipped: number;
        errors: number;
      }>;
    };

export const OPEN_FOOD_FACTS_IMPORT_CATEGORIES: OpenFoodFactsImportCategory[] = [
  {
    tag: "pizzas",
    label: "Pizza",
    category: "Pizza",
    categorySlug: "pizza",
  },
  {
    tag: "chips-and-crisps",
    label: "Chips",
    category: "Chips",
    categorySlug: "chips",
  },
  {
    tag: "ice-creams",
    label: "Eis",
    category: "Eis",
    categorySlug: "eis",
  },
  {
    tag: "protein-bars",
    label: "Proteinriegel",
    category: "Proteinriegel",
    categorySlug: "proteinriegel",
  },
  {
    tag: "protein-powders",
    label: "Proteinpulver",
    category: "Proteinpulver",
    categorySlug: "proteinpulver",
  },
  {
    tag: "snacks",
    label: "Snacks",
    category: "Snacks",
    categorySlug: null,
  },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProgressPercent(
  categoryIndex: number,
  categoryImported: number,
  categorySkipped: number,
  categoryErrors: number,
  totalCategories: number
) {
  const completedUnits =
    categoryIndex * MAX_IMPORTS_PER_CATEGORY +
    Math.min(
      MAX_IMPORTS_PER_CATEGORY,
      categoryImported + categorySkipped + categoryErrors
    );
  const totalUnits = totalCategories * MAX_IMPORTS_PER_CATEGORY;

  if (totalUnits <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(99, Math.round((completedUnits / totalUnits) * 100)));
}

export async function runOpenFoodFactsInitialImport(
  onEvent: (event: OpenFoodFactsImportProgressEvent) => void | Promise<void>
) {
  const categorySummaries: Array<{
    tag: string;
    label: string;
    imported: number;
    skipped: number;
    errors: number;
  }> = [];
  const totalCategories = OPEN_FOOD_FACTS_IMPORT_CATEGORIES.length;
  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let lastSearchRequestAt = 0;

  await onEvent({
    type: "start",
    totalCategories,
    maxImportsPerCategory: MAX_IMPORTS_PER_CATEGORY,
    totalTargetImports: totalCategories * MAX_IMPORTS_PER_CATEGORY,
  });

  for (const [categoryIndex, categoryConfig] of OPEN_FOOD_FACTS_IMPORT_CATEGORIES.entries()) {
    let categoryImported = 0;
    let categorySkipped = 0;
    let categoryErrors = 0;
    let page = 1;
    const knownBarcodes = new Set<string>();

    while (
      categoryImported < MAX_IMPORTS_PER_CATEGORY &&
      page <= MAX_PAGES_PER_CATEGORY
    ) {
      const elapsed = Date.now() - lastSearchRequestAt;
      if (lastSearchRequestAt > 0 && elapsed < MIN_SEARCH_REQUEST_INTERVAL_MS) {
        const waitMs = MIN_SEARCH_REQUEST_INTERVAL_MS - elapsed;

        await onEvent({
          type: "progress",
          percent: getProgressPercent(
            categoryIndex,
            categoryImported,
            categorySkipped,
            categoryErrors,
            totalCategories
          ),
          currentCategoryTag: categoryConfig.tag,
          currentCategoryLabel: categoryConfig.label,
          currentCategoryIndex: categoryIndex + 1,
          totalCategories,
          categoryImported,
          categorySkipped,
          categoryErrors,
          imported,
          skipped,
          errors,
          message: `Warte ${Math.ceil(waitMs / 1000)}s wegen OFF-Request-Limit...`,
        });

        await wait(waitMs);
      }

      lastSearchRequestAt = Date.now();
      const pageResponse = await fetchOpenFoodFactsProductsByCategoryTag(categoryConfig.tag, {
        countryTag: "en:germany",
        page,
        pageSize: SEARCH_PAGE_SIZE,
      });

      if (!pageResponse) {
        categoryErrors += 1;
        errors += 1;

        await onEvent({
          type: "progress",
          percent: getProgressPercent(
            categoryIndex,
            categoryImported,
            categorySkipped,
            categoryErrors,
            totalCategories
          ),
          currentCategoryTag: categoryConfig.tag,
          currentCategoryLabel: categoryConfig.label,
          currentCategoryIndex: categoryIndex + 1,
          totalCategories,
          categoryImported,
          categorySkipped,
          categoryErrors,
          imported,
          skipped,
          errors,
          message: `OFF-Suche für ${categoryConfig.label} konnte nicht geladen werden.`,
        });
        break;
      }

      if (pageResponse.products.length === 0) {
        await onEvent({
          type: "progress",
          percent: getProgressPercent(
            categoryIndex,
            categoryImported,
            categorySkipped,
            categoryErrors,
            totalCategories
          ),
          currentCategoryTag: categoryConfig.tag,
          currentCategoryLabel: categoryConfig.label,
          currentCategoryIndex: categoryIndex + 1,
          totalCategories,
          categoryImported,
          categorySkipped,
          categoryErrors,
          imported,
          skipped,
          errors,
          message: `Keine weiteren Produkte mehr in ${categoryConfig.label} gefunden.`,
        });
        break;
      }

      const pageBarcodes = pageResponse.products
        .map((product) =>
          typeof product.code === "string" ? product.code.replace(/[^\d]/g, "") : ""
        )
        .filter((barcode) => barcode.length > 0);
      const existingBarcodes = await getExistingImportedBarcodes(pageBarcodes);

      for (const barcode of existingBarcodes) {
        knownBarcodes.add(barcode);
      }

      for (const rawProduct of pageResponse.products) {
        if (categoryImported >= MAX_IMPORTS_PER_CATEGORY) {
          break;
        }

        const barcode =
          typeof rawProduct.code === "string"
            ? rawProduct.code.replace(/[^\d]/g, "").trim()
            : "";

        if (!barcode) {
          categoryErrors += 1;
          errors += 1;
          continue;
        }

        if (!hasOpenFoodFactsImage(rawProduct)) {
          categorySkipped += 1;
          skipped += 1;
          continue;
        }

        if (!hasCompleteOpenFoodFactsNutriments(rawProduct)) {
          categorySkipped += 1;
          skipped += 1;
          continue;
        }

        if (knownBarcodes.has(barcode)) {
          categorySkipped += 1;
          skipped += 1;
          continue;
        }

        const importedDraft = mapOpenFoodFactsProductToImportedDraft(rawProduct, {
          barcodeOverride: barcode,
          categoryOverride: categoryConfig.category,
          categorySlugOverride: categoryConfig.categorySlug,
        });

        if (!importedDraft) {
          categoryErrors += 1;
          errors += 1;
          continue;
        }

        const persistedProduct = await persistImportedProduct(importedDraft);

        if (!persistedProduct) {
          categoryErrors += 1;
          errors += 1;
          continue;
        }

        knownBarcodes.add(barcode);
        categoryImported += 1;
        imported += 1;

        await onEvent({
          type: "progress",
          percent: getProgressPercent(
            categoryIndex,
            categoryImported,
            categorySkipped,
            categoryErrors,
            totalCategories
          ),
          currentCategoryTag: categoryConfig.tag,
          currentCategoryLabel: categoryConfig.label,
          currentCategoryIndex: categoryIndex + 1,
          totalCategories,
          categoryImported,
          categorySkipped,
          categoryErrors,
          imported,
          skipped,
          errors,
          message: `${categoryConfig.label}: ${persistedProduct.name} importiert.`,
        });
      }

      await onEvent({
        type: "progress",
        percent: getProgressPercent(
          categoryIndex,
          categoryImported,
          categorySkipped,
          categoryErrors,
          totalCategories
        ),
        currentCategoryTag: categoryConfig.tag,
        currentCategoryLabel: categoryConfig.label,
        currentCategoryIndex: categoryIndex + 1,
        totalCategories,
        categoryImported,
        categorySkipped,
        categoryErrors,
        imported,
        skipped,
        errors,
        message: `${categoryConfig.label}: Seite ${page} verarbeitet.`,
      });

      if (pageResponse.products.length < SEARCH_PAGE_SIZE) {
        break;
      }

      page += 1;
    }

    categorySummaries.push({
      tag: categoryConfig.tag,
      label: categoryConfig.label,
      imported: categoryImported,
      skipped: categorySkipped,
      errors: categoryErrors,
    });
  }

  await onEvent({
    type: "summary",
    percent: 100,
    imported,
    skipped,
    errors,
    categories: categorySummaries,
  });
}
