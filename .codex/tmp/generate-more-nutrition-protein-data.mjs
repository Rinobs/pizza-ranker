import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const cacheDir = path.join(cwd, ".codex", "tmp", "more");
const variantCacheDir = path.join(cacheDir, "variants");
const fetchPlanPath = path.join(cacheDir, "variant-fetch-plan.json");
const outputPath = path.join(cwd, "app", "data", "more-nutrition-protein.generated.ts");

const productBaseNames = {
  "more-clear-protein": "More Nutrition More Clear Protein",
  "more-protein-iced-chai-latte": "More Nutrition More Protein Iced Chai Latte",
  "more-protein-iced-matcha-latte": "More Nutrition More Protein Iced Matcha Latte",
  "more-protein-milkshake": "More Nutrition More Protein",
  "more-protein-milkyccino": "More Nutrition More Protein Milkyccino",
  "more-saucen-back-protein": "More Nutrition More Saucen & Back Protein",
  "more-vegan-protein": "More Nutrition More Vegan Protein",
  "protein-iced-coffee": "More Nutrition More Protein Iced Coffee",
};

const entityMap = {
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&auml;": "ä",
  "&Auml;": "Ä",
  "&ouml;": "ö",
  "&Ouml;": "Ö",
  "&uuml;": "ü",
  "&Uuml;": "Ü",
  "&szlig;": "ß",
};

const nutritionKeyByLabel = {
  "davon gesattigte fettsauren": "saturatedFat",
  "davon gesaettigte fettsaeuren": "saturatedFat",
  "davon zucker": "sugar",
  "eiweiss / protein": "protein",
  "eiweiss": "protein",
  "eiweiß / protein": "protein",
  "eiweiß": "protein",
  "energie": "energy",
  "fett": "fat",
  "glucomannan": "glucomannan",
  "koffein": "koffein",
  "kohlenhydrate": "carbs",
  "mehrwertige alkohole": "polyole",
  "protein": "protein",
  "salz": "salz",
  "ballaststoffe": "ballaststoffe",
};

function decodeHtml(value) {
  return value
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&(amp|apos|quot|lt|gt|nbsp|auml|Auml|ouml|Ouml|uuml|Uuml|szlig);/g, (match) => {
      return entityMap[match] ?? match;
    });
}

function stripHtml(value) {
  return decodeHtml(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s+%/g, "%")
    .replace(/\s+\)/g, ")")
    .replace(/\(\s+/g, "(")
    .trim();
}

function normalizeLabel(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  const normalized = match[0].replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(cents) {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function formatWeight(weightInGrams) {
  return `${weightInGrams} g`;
}

function escapeTs(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$\{/g, "\\${");
}

function normalizeFlavorKey(flavor) {
  return flavor
    .replace(/\s+\((?:More Girl Edition|Gold Edition|New Years Edition|Special Frühling Design)\)$/i, "")
    .replace(/\s+Limited$/i, "")
    .replace(/\s+V\d+$/i, "")
    .trim();
}

function chooseVariant(variants) {
  return [...variants].sort((left, right) => {
    const leftIsEdition = /edition|design/i.test(left.option1 ?? left.title);
    const rightIsEdition = /edition|design/i.test(right.option1 ?? right.title);

    if (leftIsEdition !== rightIsEdition) {
      return Number(leftIsEdition) - Number(rightIsEdition);
    }

    const leftWeight = Number(left.weight ?? 0);
    const rightWeight = Number(right.weight ?? 0);
    if (leftWeight !== rightWeight) {
      return rightWeight - leftWeight;
    }

    return String(left.title).localeCompare(String(right.title), "de");
  })[0];
}

function extractBlock(html, title) {
  const pattern = new RegExp(`<h3>${title}<\\/h3>([\\s\\S]*?)(?:<h3>|<\\/div>\\s*<\\/details>)`, "i");
  const match = html.match(pattern);
  return match ? stripHtml(match[1]) : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractTableSection(html, sectionTitle) {
  const escapedTitle = escapeRegExp(sectionTitle);
  const pattern = new RegExp(
    `<summary[^>]*>\\s*${escapedTitle}[\\s\\S]*?<\\/summary>[\\s\\S]*?<table[^>]*>([\\s\\S]*?)<\\/table>`,
    "i"
  );
  const match = html.match(pattern);
  return match ? match[1] : "";
}

function extractTable(tableHtml) {
  const headerSource =
    tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)?.[1] ??
    tableHtml.match(/<tr[\s\S]*?<\/tr>/i)?.[0] ??
    "";
  const headers = [...headerSource.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((headerMatch) =>
    stripHtml(headerMatch[1])
  );

  const rows = [];
  const tbody = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] ?? tableHtml;
  const rowMatches = tbody.matchAll(/<tr[\s\S]*?<\/tr>/gi);

  for (const rowMatch of rowMatches) {
    const cellValues = [...rowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (cellMatch) => stripHtml(cellMatch[1])
    );

    if (cellValues.length >= 2) {
      rows.push({
        label: cellValues[0],
        values: cellValues.slice(1),
      });
    }
  }

  return { headers, rows };
}

function findPreferredColumnIndex(headers, patterns) {
  const normalizedHeaders = headers.map((header) => normalizeLabel(header));

  for (const pattern of patterns) {
    const matchIndex = normalizedHeaders.findIndex((header) => pattern.test(header));
    if (matchIndex >= 0) {
      return Math.max(matchIndex - 1, 0);
    }
  }

  return 0;
}

function extractNutritionLegacy(html) {
  const section = extractTableSection(html, "Nährwerte");
  const rows = extractRows(section);
  const values = {};

  for (const row of rows) {
    const label = normalizeLabel(row[0]);
    const key = nutritionKeyByLabel[label];
    if (!key) {
      continue;
    }

    const value = row[row.length - 1];
    values[key] = value;
  }

  return values;
}

function extractEnergyAndKcal(rawEnergy) {
  const normalized = rawEnergy.replace(/\s+/g, " ").trim();
  const parts = normalized.split("/").map((part) => part.trim()).filter(Boolean);

  const energyKjPart = parts.find((part) => /kj/i.test(part)) ?? normalized;
  const kcalPart = parts.find((part) => /kcal/i.test(part)) ?? normalized;

  return {
    energyKj: `${energyKjPart} / 100 g`,
    kcal: `${kcalPart} / 100 g`,
    kcalNumber: parseNumber(kcalPart),
  };
}

function buildNutritionRecord(rawNutrition) {
  const energy = rawNutrition.energy ? extractEnergyAndKcal(rawNutrition.energy) : null;

  return {
    energyKj: energy?.energyKj,
    kcal: energy?.kcal ?? null,
    kcalNumber: energy?.kcalNumber ?? null,
    protein: rawNutrition.protein ? `${rawNutrition.protein} / 100 g` : null,
    proteinNumber: rawNutrition.protein ? parseNumber(rawNutrition.protein) : null,
    fat: rawNutrition.fat ? `${rawNutrition.fat} / 100 g` : null,
    fatNumber: rawNutrition.fat ? parseNumber(rawNutrition.fat) : null,
    saturatedFat: rawNutrition.saturatedFat ? `${rawNutrition.saturatedFat} / 100 g` : null,
    carbs: rawNutrition.carbs ? `${rawNutrition.carbs} / 100 g` : null,
    carbsNumber: rawNutrition.carbs ? parseNumber(rawNutrition.carbs) : null,
    sugar: rawNutrition.sugar ? `${rawNutrition.sugar} / 100 g` : null,
    ballaststoffe: rawNutrition.ballaststoffe ? `${rawNutrition.ballaststoffe} / 100 g` : null,
    salz: rawNutrition.salz ? `${rawNutrition.salz} / 100 g` : null,
    koffein: rawNutrition.koffein ? `${rawNutrition.koffein} / 100 g` : null,
    glucomannan: rawNutrition.glucomannan ? `${rawNutrition.glucomannan} / 100 g` : null,
    polyole: rawNutrition.polyole ? `${rawNutrition.polyole} / 100 g` : null,
  };
}

function extractAminoProfileLegacy(html) {
  const section = extractTableSection(html, "Aminosäureprofil");
  const rows = extractRows(section);

  return rows.map((row) => ({
    name: row[0],
    amount: row[row.length - 1],
  }));
}

function extractNutrition(html) {
  const section = extractTableSection(html, "Nährwerte");
  const table = extractTable(section);
  const preferredColumnIndex = findPreferredColumnIndex(table.headers, [
    /^pro\s*100\s*g$/,
    /^100\s*g$/,
    /\bpro\s*100\s*g\b/,
    /\b100\s*g\b/,
  ]);
  const values = {};

  for (const row of table.rows) {
    const label = normalizeLabel(row.label);
    const key = nutritionKeyByLabel[label];
    if (!key) {
      continue;
    }

    const value =
      row.values[preferredColumnIndex] ??
      row.values.find((cellValue) => /\d/.test(cellValue)) ??
      row.values[row.values.length - 1];

    if (!value) {
      continue;
    }

    values[key] = value;
  }

  return values;
}

function extractAminoProfile(html) {
  const section = extractTableSection(html, "Aminosäureprofil");
  const table = extractTable(section);
  const preferredColumnIndex = findPreferredColumnIndex(table.headers, [
    /\bpro\s*100\s*g\s*protein\b/,
    /\b100\s*g\s*protein\b/,
  ]);

  return table.rows
    .map((row) => ({
      name: row.label,
      amount:
        row.values[preferredColumnIndex] ??
        row.values.find((cellValue) => /\d/.test(cellValue)) ??
        row.values[row.values.length - 1],
    }))
    .filter((row) => row.name && row.amount);
}

async function loadProductJson(handle) {
  const raw = (await fs.readFile(path.join(cacheDir, `${handle}.json`), "utf8")).replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

function variantCachePath(handle, variantId) {
  return path.join(variantCacheDir, `${handle}-${variantId}.html`);
}

function variantFlavor(variant) {
  return variant.option1 || variant.public_title?.split(" / ")[0] || variant.title.split(" / ")[0];
}

function buildDisplayName(handle, flavor) {
  const baseName = productBaseNames[handle] ?? `More Nutrition ${handle}`;
  return `${baseName} - ${flavor}`;
}

function cloneAminoProfile(aminoProfile) {
  return aminoProfile.map((entry) => ({ ...entry }));
}

function applyAminoFallbacks(variants) {
  const milkProteinFallback =
    variants.find((variant) => variant.name === "More Nutrition More Protein - Milkshake Style Neutral")
      ?.aminosaeurenprofil ??
    variants.find(
      (variant) => variant.handle === "more-protein-milkshake" && variant.aminosaeurenprofil.length > 0
    )?.aminosaeurenprofil ??
    [];

  const fallbackByHandle = {
    "protein-iced-coffee": milkProteinFallback,
    "more-protein-iced-matcha-latte": milkProteinFallback,
    "more-protein-iced-chai-latte": milkProteinFallback,
    "more-protein-milkyccino": milkProteinFallback,
  };

  for (const variant of variants) {
    if (variant.aminosaeurenprofil.length > 0) {
      continue;
    }

    const fallbackProfile = fallbackByHandle[variant.handle];
    if (fallbackProfile?.length) {
      variant.aminosaeurenprofil = cloneAminoProfile(fallbackProfile);
    }
  }
}

function renderAminoProfile(aminoProfile) {
  if (aminoProfile.length === 0) {
    return "undefined";
  }

  const items = aminoProfile
    .map(
      (entry) =>
        `      { name: "${escapeTs(entry.name)}", amount: "${escapeTs(entry.amount)}" }`
    )
    .join(",\n");

  return `[\n${items}\n    ]`;
}

function renderVariant(variant) {
  const nutrition = variant.nutrition;
  const nutritionLines = [
    `      energyKj: "${escapeTs(nutrition.energyKj ?? "")}"`,
    `      kcal: "${escapeTs(nutrition.kcal ?? "")}"`,
    `      protein: "${escapeTs(nutrition.protein ?? "")}"`,
    `      fat: "${escapeTs(nutrition.fat ?? "")}"`,
    nutrition.saturatedFat && `      saturatedFat: "${escapeTs(nutrition.saturatedFat)}"`,
    `      carbs: "${escapeTs(nutrition.carbs ?? "")}"`,
    nutrition.sugar && `      sugar: "${escapeTs(nutrition.sugar)}"`,
    nutrition.ballaststoffe && `      ballaststoffe: "${escapeTs(nutrition.ballaststoffe)}"`,
    nutrition.salz && `      salz: "${escapeTs(nutrition.salz)}"`,
    nutrition.koffein && `      koffein: "${escapeTs(nutrition.koffein)}"`,
    nutrition.glucomannan && `      glucomannan: "${escapeTs(nutrition.glucomannan)}"`,
    nutrition.polyole && `      polyole: "${escapeTs(nutrition.polyole)}"`,
  ]
    .filter(Boolean)
    .join(",\n");

  return `  {
    name: "${escapeTs(variant.name)}",
    imageUrl: "${escapeTs(variant.imageUrl)}",
    price: "${escapeTs(variant.price)}",
    weight: "${escapeTs(variant.weight)}",
    zutaten: "${escapeTs(variant.zutaten)}",
    naehrwerte: {
${nutritionLines}
    },
    aminosaeurenprofil: ${renderAminoProfile(variant.aminosaeurenprofil)},
  }`;
}

function buildTsModule(variants) {
  const variantItems = variants.map(renderVariant).join(",\n");

  return `type ProductSummary = {
  name: string;
  imageUrl: string;
  category: string;
  slug: string;
  price?: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
};

type AminoAcidEntry = {
  name: string;
  amount: string;
};

type ProductDetailsRecord = {
  marke: string;
  gewicht: string;
  preis: string;
  kategorie?: string | null;
  zutaten: string;
  naehrwerte: {
    energyKj?: number | string;
    kcal: number | string;
    protein: number | string;
    fat: number | string;
    saturatedFat?: number | string;
    carbs: number | string;
    sugar?: number | string;
    ballaststoffe?: number | string;
    salz?: number | string;
    koffein?: number | string;
    glucomannan?: number | string;
    polyole?: number | string;
  };
  aminosaeurenprofil?: AminoAcidEntry[];
  quelle: "online" | "placeholder";
};

type MoreNutritionVariantRecord = {
  name: string;
  imageUrl: string;
  price: string;
  weight: string;
  zutaten: string;
  naehrwerte: ProductDetailsRecord["naehrwerte"];
  aminosaeurenprofil?: AminoAcidEntry[];
};

function parseMetricValue(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const match = value.match(/-?\\d+(?:[.,]\\d+)?/);
  if (!match) {
    return undefined;
  }

  const parsed = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

const MORE_NUTRITION_VARIANTS = [
${variantItems}
] satisfies MoreNutritionVariantRecord[];

export const MORE_NUTRITION_PROTEINPULVER_PRODUCTS = MORE_NUTRITION_VARIANTS.map(
  (variant) => ({
    name: variant.name,
    imageUrl: variant.imageUrl,
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: variant.price,
    kcal: parseMetricValue(variant.naehrwerte.kcal),
    protein: parseMetricValue(variant.naehrwerte.protein),
    fat: parseMetricValue(variant.naehrwerte.fat),
    carbs: parseMetricValue(variant.naehrwerte.carbs),
  })
) satisfies ProductSummary[];

export const MORE_NUTRITION_PROTEIN_DETAILS = Object.fromEntries(
  MORE_NUTRITION_VARIANTS.map((variant) => [
    variant.name,
    {
      marke: "More Nutrition",
      gewicht: variant.weight,
      preis: variant.price,
      kategorie: "Proteinpulver",
      zutaten: variant.zutaten,
      naehrwerte: variant.naehrwerte,
      aminosaeurenprofil: variant.aminosaeurenprofil,
      quelle: "online",
    },
  ])
) satisfies Record<string, ProductDetailsRecord>;
`;
}

async function getSelectedVariants() {
  const handles = Object.keys(productBaseNames);
  const selections = [];

  for (const handle of handles) {
    const product = await loadProductJson(handle);
    const grouped = new Map();

    for (const variant of product.variants) {
      if (/probe/i.test(variant.title)) {
        continue;
      }

      const flavor = variantFlavor(variant);
      const flavorKey = normalizeFlavorKey(flavor);
      const items = grouped.get(flavorKey) ?? [];
      items.push(variant);
      grouped.set(flavorKey, items);
    }

    const selectedVariants = [...grouped.values()].map(chooseVariant);
    selections.push({ handle, variants: selectedVariants });
  }

  return selections;
}

async function writeFetchPlan() {
  const selections = await getSelectedVariants();
  const plan = selections.flatMap(({ handle, variants }) =>
    variants.map((variant) => ({
      handle,
      variantId: variant.id,
      flavor: normalizeFlavorKey(variantFlavor(variant)),
      url: `https://morenutrition.de/products/${handle}?variant=${variant.id}`,
      cachePath: variantCachePath(handle, variant.id),
    }))
  );

  await fs.mkdir(variantCacheDir, { recursive: true });
  await fs.writeFile(fetchPlanPath, JSON.stringify(plan, null, 2), "utf8");
  console.log(`Wrote fetch plan for ${plan.length} variant pages to ${fetchPlanPath}`);
}

async function readVariantHtml(handle, variantId) {
  try {
    return await fs.readFile(variantCachePath(handle, variantId), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`Missing cached HTML for ${handle}?variant=${variantId}`);
    }

    throw error;
  }
}

async function main() {
  const selections = await getSelectedVariants();
  const variants = [];

  for (const { handle, variants: selectedVariants } of selections) {

    for (const variant of selectedVariants) {
      const flavor = normalizeFlavorKey(variantFlavor(variant));
      const html = await readVariantHtml(handle, variant.id);
      const rawNutrition = extractNutrition(html);
      const nutrition = buildNutritionRecord(rawNutrition);
      const aminoProfile = extractAminoProfile(html);
      const zutaten = extractBlock(html, "Zutaten");

      variants.push({
        handle,
        name: buildDisplayName(handle, flavor),
        imageUrl: variant.featured_image?.src ?? variant.featured_media?.preview_image?.src ?? "",
        price: formatCurrency(variant.price),
        weight: formatWeight(Number(variant.weight ?? 0)),
        zutaten,
        nutrition,
        aminosaeurenprofil: aminoProfile,
      });
    }
  }

  applyAminoFallbacks(variants);
  variants.sort((left, right) => left.name.localeCompare(right.name, "de"));
  await fs.writeFile(outputPath, buildTsModule(variants), "utf8");
  console.log(`Generated ${variants.length} More Nutrition protein variants.`);
}

const isPlanMode = process.argv.includes("--plan");

(isPlanMode ? writeFetchPlan() : main()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
