import {
  getCategoryNavigationItem,
  normalizeSearchText,
  type CategoryNavigationItem,
} from "@/lib/product-navigation";

type CategoryInferenceInput = {
  name?: string | null;
  brand?: string | null;
  categories?: string | null;
  categoriesTags?: string[] | null;
  ingredientsText?: string | null;
  protein?: number | null;
  quantity?: string | null;
};

const CATEGORY_PRIORITY: CategoryNavigationItem["slug"][] = [
  "proteinriegel",
  "proteinpulver",
  "proteinsnacks",
  "pizza",
  "chips",
  "eis",
];

const CATEGORY_TAG_SIGNALS: Record<CategoryNavigationItem["slug"], string[]> = {
  pizza: ["pizza", "pizzas"],
  chips: ["chips-and-crisps", "crisps", "chips"],
  eis: ["ice-creams", "ice-cream", "gelato", "sorbets"],
  proteinpulver: ["protein-powders", "protein-powder", "whey-powders"],
  proteinriegel: ["protein-bars", "protein-bar"],
  proteinsnacks: [
    "protein-snacks",
    "protein-snack",
    "protein-cookies",
    "protein-cookie",
    "protein-wafers",
    "protein-wafer",
  ],
};

const CATEGORY_TEXT_SIGNALS: Record<CategoryNavigationItem["slug"], string[]> = {
  pizza: ["pizza", "tiefkuhlpizza", "frozen pizza", "steinofenpizza"],
  chips: ["chips", "crisps", "kartoffelchips", "potato chips", "tortilla chips", "maischips"],
  eis: ["eis", "eiscreme", "ice cream", "gelato", "sorbet"],
  proteinpulver: [
    "proteinpulver",
    "eiweisspulver",
    "whey",
    "clear whey",
    "whey isolate",
    "isolat",
    "isolate",
    "casein",
    "caseinate",
    "protein powder",
    "protein shake",
    "shake powder",
    "powder",
  ],
  proteinriegel: [
    "proteinriegel",
    "protein riegel",
    "eiweissriegel",
    "eiweiss riegel",
    "protein bar",
    "protein bars",
  ],
  proteinsnacks: [
    "proteinsnack",
    "protein snack",
    "protein snacks",
    "protein cookie",
    "protein cookies",
    "protein wafer",
    "protein wafers",
    "protein bites",
    "protein balls",
    "protein clusters",
  ],
};

function buildNormalizedText(input: CategoryInferenceInput) {
  return normalizeSearchText(
    [
      input.name,
      input.brand,
      input.categories,
      input.ingredientsText,
      input.quantity,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function buildRawTagText(categoryTags: string[] | null | undefined) {
  return (categoryTags ?? [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function includesNormalizedTerm(text: string, term: string) {
  const normalizedTerm = normalizeSearchText(term);
  return normalizedTerm.length > 0 && text.includes(normalizedTerm);
}

function hasAnyNormalizedTerm(text: string, terms: string[]) {
  return terms.some((term) => includesNormalizedTerm(text, term));
}

function hasAnyRawTag(tagText: string, terms: string[]) {
  return terms.some((term) => tagText.includes(term.toLowerCase()));
}

export function inferImportedProductCategory(
  input: CategoryInferenceInput
): {
  categorySlug: CategoryNavigationItem["slug"];
  category: string;
  score: number;
} | null {
  const text = buildNormalizedText(input);
  const tagText = buildRawTagText(input.categoriesTags);

  if (!text && !tagText) {
    return null;
  }

  const scores = new Map<CategoryNavigationItem["slug"], number>(
    CATEGORY_PRIORITY.map((slug) => [slug, 0] as const)
  );
  const addScore = (slug: CategoryNavigationItem["slug"], score: number) => {
    scores.set(slug, (scores.get(slug) ?? 0) + score);
  };

  for (const slug of CATEGORY_PRIORITY) {
    if (hasAnyRawTag(tagText, CATEGORY_TAG_SIGNALS[slug])) {
      addScore(slug, 180);
    }

    if (hasAnyNormalizedTerm(text, CATEGORY_TEXT_SIGNALS[slug])) {
      addScore(slug, 120);
    }
  }

  const hasProteinWord = hasAnyNormalizedTerm(text, [
    "protein",
    "eiweiss",
    "high protein",
  ]);
  const hasBarWord = hasAnyNormalizedTerm(text, ["riegel", "bar", "bars"]);
  const hasPowderWord = hasAnyNormalizedTerm(text, [
    "pulver",
    "powder",
    "whey",
    "isolat",
    "isolate",
    "casein",
    "caseinate",
    "shake",
  ]);
  const hasSnackSubtypeWord = hasAnyNormalizedTerm(text, [
    "cookie",
    "cookies",
    "wafer",
    "wafers",
    "bites",
    "balls",
    "clusters",
  ]);
  const hasChipsWord = hasAnyNormalizedTerm(text, [
    "chips",
    "crisps",
    "potato chips",
    "tortilla chips",
  ]);
  const hasHighProteinDensity =
    typeof input.protein === "number" && Number.isFinite(input.protein) && input.protein >= 20;

  if (hasProteinWord && hasBarWord) {
    addScore("proteinriegel", 180);
    addScore("chips", -120);
    addScore("proteinpulver", -80);
  }

  if (hasBarWord && hasHighProteinDensity) {
    addScore("proteinriegel", 160);
    addScore("chips", -120);
  }

  if (hasProteinWord && hasPowderWord) {
    addScore("proteinpulver", 180);
    addScore("proteinriegel", -120);
    addScore("chips", -120);
  }

  if (hasProteinWord && hasSnackSubtypeWord) {
    addScore("proteinsnacks", 160);
  }

  if (hasChipsWord && !hasProteinWord) {
    addScore("chips", 80);
  }

  const ranked = CATEGORY_PRIORITY.map((slug) => ({
    slug,
    score: scores.get(slug) ?? 0,
  })).sort((left, right) => right.score - left.score);

  const bestMatch = ranked[0];
  const secondBestMatch = ranked[1];

  if (!bestMatch || bestMatch.score < 120) {
    return null;
  }

  if (
    secondBestMatch &&
    secondBestMatch.score >= 120 &&
    bestMatch.score - secondBestMatch.score < 30
  ) {
    return null;
  }

  const category = getCategoryNavigationItem(bestMatch.slug);
  if (!category) {
    return null;
  }

  return {
    categorySlug: category.slug,
    category: category.category,
    score: bestMatch.score,
  };
}
