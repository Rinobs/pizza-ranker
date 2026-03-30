import { getProductRouteSlug, type Product } from "@/app/data/products";
export type DiscoverSortMode = "popular" | "best" | "new" | "price";

export type DiscoverSortOption = {
  value: DiscoverSortMode;
  label: string;
  hint: string;
};

export type CategoryNavigationItem = {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  icon: string;
  href: string;
  description: string;
  aliases: string[];
};

export const CATEGORY_NAV_ITEMS: CategoryNavigationItem[] = [
  {
    slug: "pizza",
    name: "Tiefkühlpizza",
    shortName: "Pizza",
    category: "Pizza",
    icon: "\u{1F355}",
    href: "/pizza",
    description: "Pizza-Rankings & Bewertungen",
    aliases: ["pizza", "tiefkuehlpizza", "tk pizza", "salami", "margherita"],
  },
  {
    slug: "chips",
    name: "Chips",
    shortName: "Chips",
    category: "Chips",
    icon: "\u{1F35F}",
    href: "/chips",
    description: "Crunchy Favoriten vergleichen",
    aliases: ["chips", "crisps", "snack", "paprika", "salz"],
  },
  {
    slug: "eis",
    name: "Eis",
    shortName: "Eis",
    category: "Eis",
    icon: "\u{1F366}",
    href: "/eis",
    description: "Sorten entdecken und bewerten",
    aliases: ["eis", "ice cream", "vanille", "schoko", "erdbeer"],
  },
  {
    slug: "proteinpulver",
    name: "Proteinpulver",
    shortName: "Proteinpulver",
    category: "Proteinpulver",
    icon: "\u{1F4AA}",
    href: "/proteinpulver",
    description: "Makros, Geschmack, Preis",
    aliases: ["proteinpulver", "protein", "whey", "eiweiss", "vanilla"],
  },
  {
    slug: "proteinriegel",
    name: "Proteinriegel",
    shortName: "Proteinriegel",
    category: "Proteinriegel",
    icon: "\u{1F36B}",
    href: "/proteinriegel",
    description: "Snacks mit Score",
    aliases: ["proteinriegel", "riegel", "bar", "schokolade", "caramel"],
  },
  {
    slug: "proteinsnacks",
    name: "Proteinsnacks",
    shortName: "Proteinsnacks",
    category: "Proteinsnacks",
    icon: "\u{1F96E}",
    href: "/proteinsnacks",
    description: "Cookies, Wafer & Snack-Favoriten",
    aliases: ["proteinsnacks", "protein snack", "cookie", "wafer", "balls", "bites"],
  },
];

export const DEFAULT_DISCOVER_SORT: DiscoverSortMode = "popular";

export const DISCOVER_SORT_OPTIONS: DiscoverSortOption[] = [
  {
    value: "popular",
    label: "Beliebt",
    hint: "Meiste Bewertungen zuerst",
  },
  {
    value: "best",
    label: "Beste",
    hint: "Höchste Bewertung zuerst",
  },
  {
    value: "new",
    label: "Neu",
    hint: "Zuletzt hinzugefügt zuerst",
  },
  {
    value: "price",
    label: "Preis",
    hint: "Günstigste zuerst",
  },
];

export const DISCOVER_QUICK_SEARCH_TAGS = [
  "Salami",
  "Vanille",
  "Schokolade",
  "Margherita",
  "Protein",
];

export function isDiscoverSortMode(value: string | null): value is DiscoverSortMode {
  return value === "popular" || value === "best" || value === "new" || value === "price";
}

export function isCategoryFilter(value: string | null): value is CategoryNavigationItem["slug"] {
  return CATEGORY_NAV_ITEMS.some((item) => item.slug === value);
}

export function getCategoryNavigationItem(slug: string | null | undefined) {
  return CATEGORY_NAV_ITEMS.find((item) => item.slug === slug) ?? null;
}

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEARCH_TOKEN_EQUIVALENT_GROUPS = [
  ["schokolade", "schoko", "chocolate", "choco", "cocoa", "kakao"],
  ["vanille", "vanilla"],
  ["erdbeer", "strawberry"],
  ["karamell", "caramel"],
  ["keks", "kekse", "cookie", "cookies", "biscuit", "biscuits"],
  ["zimt", "cinnamon"],
  ["haselnuss", "hazelnut"],
  ["banane", "banana"],
  ["kaffee", "coffee"],
] as const;

const SEARCH_TOKEN_CANONICAL_MAP = new Map<string, string>(
  SEARCH_TOKEN_EQUIVALENT_GROUPS.flatMap((group) =>
    group.map((token) => [token, group[0]] as const)
  )
);

function canonicalizeSearchToken(token: string) {
  return SEARCH_TOKEN_CANONICAL_MAP.get(token) ?? token;
}

function getTokens(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function getCanonicalTokens(value: string) {
  return getTokens(value).map(canonicalizeSearchToken);
}

type PreparedSearchQuery = {
  normalizedQuery: string;
  queryTokens: string[];
};

type PreparedProductSearch = {
  name: string;
  category: string;
  routeSlug: string;
  aliasText: string;
  nameTokens: string[];
  categoryTokens: string[];
  combinedSearchText: string;
};

const preparedSearchQueryCache = new Map<string, PreparedSearchQuery>();
const preparedProductSearchCache = new Map<string, PreparedProductSearch>();

function getPreparedSearchQuery(query: string): PreparedSearchQuery | null {
  const queryKey = query.trim();

  if (preparedSearchQueryCache.has(queryKey)) {
    return preparedSearchQueryCache.get(queryKey) ?? null;
  }

  const normalizedQuery = normalizeSearchText(queryKey);
  if (!normalizedQuery) {
    return null;
  }

  const queryTokens = getCanonicalTokens(normalizedQuery);
  if (queryTokens.length === 0) {
    return null;
  }

  const preparedQuery = {
    normalizedQuery,
    queryTokens,
  };

  preparedSearchQueryCache.set(queryKey, preparedQuery);
  return preparedQuery;
}

function getPreparedProductSearch(
  product: Pick<Product, "name" | "category" | "slug">
): PreparedProductSearch {
  const cacheKey = `${product.slug}\u0000${product.category}\u0000${product.name}`;
  const cached = preparedProductSearchCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const name = normalizeSearchText(product.name);
  const category = normalizeSearchText(product.category);
  const routeSlug = normalizeSearchText(getProductRouteSlug(product));
  const categoryItem = getCategoryNavigationItem(product.slug);
  const aliasText = normalizeSearchText(
    [
      product.slug,
      categoryItem?.name ?? "",
      categoryItem?.shortName ?? "",
      ...(categoryItem?.aliases ?? []),
    ].join(" ")
  );
  const nameTokens = getCanonicalTokens(name);
  const categoryTokens = getCanonicalTokens(`${category} ${aliasText}`);
  const combinedSearchText = `${name} ${category} ${aliasText} ${routeSlug}`.trim();

  const preparedProduct = {
    name,
    category,
    routeSlug,
    aliasText,
    nameTokens,
    categoryTokens,
    combinedSearchText,
  };

  preparedProductSearchCache.set(cacheKey, preparedProduct);
  return preparedProduct;
}

export function getProductSearchScore(
  product: Pick<Product, "name" | "category" | "slug">,
  query: string
) {
  const preparedQuery = getPreparedSearchQuery(query);
  if (!preparedQuery) {
    return 0;
  }

  const { normalizedQuery, queryTokens } = preparedQuery;
  const {
    name,
    category,
    routeSlug,
    aliasText,
    nameTokens,
    categoryTokens,
    combinedSearchText,
  } = getPreparedProductSearch(product);

  let score = 0;

  if (name === normalizedQuery) score += 500;
  if (name.startsWith(normalizedQuery)) score += 220;
  if (name.includes(normalizedQuery)) score += 140;
  if (category === normalizedQuery || aliasText === normalizedQuery) score += 180;
  if (category.includes(normalizedQuery) || aliasText.includes(normalizedQuery)) score += 110;
  if (routeSlug.includes(normalizedQuery)) score += 70;

  for (const token of queryTokens) {
    let tokenScore = 0;

    if (nameTokens.some((candidate) => candidate === token)) tokenScore = Math.max(tokenScore, 120);
    if (nameTokens.some((candidate) => candidate.startsWith(token))) {
      tokenScore = Math.max(tokenScore, 100);
    }
    if (name.includes(token)) tokenScore = Math.max(tokenScore, 80);

    if (categoryTokens.some((candidate) => candidate === token)) {
      tokenScore = Math.max(tokenScore, 75);
    }
    if (categoryTokens.some((candidate) => candidate.startsWith(token))) {
      tokenScore = Math.max(tokenScore, 60);
    }

    if (routeSlug.includes(token)) tokenScore = Math.max(tokenScore, 45);

    if (tokenScore === 0) {
      return 0;
    }

    score += tokenScore;
  }

  if (queryTokens.length > 1) {
    const matchesAllInName = queryTokens.every((token) => name.includes(token));
    const matchesAllAnywhere = queryTokens.every((token) => combinedSearchText.includes(token));

    if (matchesAllInName) {
      score += 120;
    } else if (matchesAllAnywhere) {
      score += 70;
    }
  }

  return score;
}

export type DiscoverSortable = {
  name: string;
  ratingAvg: number | null;
  ratingCount: number;
  newIndex: number;
  priceValue: number | null;
};

export function compareByDiscoverSort(
  left: DiscoverSortable,
  right: DiscoverSortable,
  sortMode: DiscoverSortMode
) {
  const leftAvg = left.ratingAvg ?? 0;
  const rightAvg = right.ratingAvg ?? 0;

  if (sortMode === "price") {
    const leftHasPrice = typeof left.priceValue === "number" ? 1 : 0;
    const rightHasPrice = typeof right.priceValue === "number" ? 1 : 0;

    if (leftHasPrice !== rightHasPrice) {
      return rightHasPrice - leftHasPrice;
    }
    if (
      typeof left.priceValue === "number" &&
      typeof right.priceValue === "number" &&
      left.priceValue !== right.priceValue
    ) {
      return left.priceValue - right.priceValue;
    }
    if (left.ratingCount !== right.ratingCount) {
      return right.ratingCount - left.ratingCount;
    }
    if (leftAvg !== rightAvg) {
      return rightAvg - leftAvg;
    }
    if (left.newIndex !== right.newIndex) {
      return right.newIndex - left.newIndex;
    }

    return left.name.localeCompare(right.name, "de");
  }

  if (sortMode === "new") {
    if (left.newIndex !== right.newIndex) {
      return right.newIndex - left.newIndex;
    }
    if (left.ratingCount !== right.ratingCount) {
      return right.ratingCount - left.ratingCount;
    }
    if (leftAvg !== rightAvg) {
      return rightAvg - leftAvg;
    }
    return left.name.localeCompare(right.name, "de");
  }

  if (sortMode === "popular") {
    if (left.ratingCount !== right.ratingCount) {
      return right.ratingCount - left.ratingCount;
    }
    if (leftAvg !== rightAvg) {
      return rightAvg - leftAvg;
    }
    if (left.newIndex !== right.newIndex) {
      return right.newIndex - left.newIndex;
    }
    return left.name.localeCompare(right.name, "de");
  }

  const leftRated = left.ratingCount > 0 && left.ratingAvg !== null ? 1 : 0;
  const rightRated = right.ratingCount > 0 && right.ratingAvg !== null ? 1 : 0;

  if (leftRated !== rightRated) {
    return rightRated - leftRated;
  }
  if (leftAvg !== rightAvg) {
    return rightAvg - leftAvg;
  }
  if (left.ratingCount !== right.ratingCount) {
    return right.ratingCount - left.ratingCount;
  }
  if (left.newIndex !== right.newIndex) {
    return right.newIndex - left.newIndex;
  }

  return left.name.localeCompare(right.name, "de");
}

