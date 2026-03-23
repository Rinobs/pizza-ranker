type ProductSummary = {
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
    glucomannan?: number | string;
    polyole?: number | string;
  };
  aminosaeurenprofil?: AminoAcidEntry[];
  quelle: "online" | "placeholder";
};

type NutritionPair = {
  perServing: string;
  per100: string;
};

type VariantNutrition = {
  energyKj?: NutritionPair;
  kcal: NutritionPair;
  protein: NutritionPair;
  fat: NutritionPair;
  saturatedFat?: NutritionPair;
  carbs: NutritionPair;
  sugar?: NutritionPair;
  ballaststoffe?: NutritionPair;
  salz?: NutritionPair;
  glucomannan?: NutritionPair;
  polyole?: NutritionPair;
};

type ProteinBarVariant = {
  name: string;
  marke: string;
  imageUrl: string;
  summaryPrice: string;
  detailPrice: string;
  gewicht: string;
  servingLabel: string;
  zutaten: string;
  nutrition: VariantNutrition;
};

function pair(perServing: string, per100: string): NutritionPair {
  return { perServing, per100 };
}

function formatNumber(value: number): string {
  const rounded = Math.abs(value) < 1 ? Number(value.toFixed(2)) : Number(value.toFixed(1));
  const normalized = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
  return normalized;
}

function derivedPair(perServing: number, unit: string, servingWeightGrams: number): NutritionPair {
  const per100 = (perServing / servingWeightGrams) * 100;
  return pair(`${formatNumber(perServing)} ${unit}`, `${formatNumber(per100)} ${unit}`);
}

function derivedNutrition(config: {
  servingWeightGrams: number;
  kcal: number;
  energyKj?: number;
  protein: number;
  fat: number;
  saturatedFat?: number;
  carbs: number;
  sugar?: number;
  ballaststoffe?: number;
  salz?: number;
  polyole?: number;
  glucomannan?: number;
}): VariantNutrition {
  const energyKj = config.energyKj ?? config.kcal * 4.184;

  return {
    energyKj: derivedPair(energyKj, "kJ", config.servingWeightGrams),
    kcal: derivedPair(config.kcal, "kcal", config.servingWeightGrams),
    protein: derivedPair(config.protein, "g", config.servingWeightGrams),
    fat: derivedPair(config.fat, "g", config.servingWeightGrams),
    saturatedFat:
      typeof config.saturatedFat === "number"
        ? derivedPair(config.saturatedFat, "g", config.servingWeightGrams)
        : undefined,
    carbs: derivedPair(config.carbs, "g", config.servingWeightGrams),
    sugar:
      typeof config.sugar === "number"
        ? derivedPair(config.sugar, "g", config.servingWeightGrams)
        : undefined,
    ballaststoffe:
      typeof config.ballaststoffe === "number"
        ? derivedPair(config.ballaststoffe, "g", config.servingWeightGrams)
        : undefined,
    salz:
      typeof config.salz === "number"
        ? derivedPair(config.salz, "g", config.servingWeightGrams)
        : undefined,
    polyole:
      typeof config.polyole === "number"
        ? derivedPair(config.polyole, "g", config.servingWeightGrams)
        : undefined,
    glucomannan:
      typeof config.glucomannan === "number"
        ? derivedPair(config.glucomannan, "g", config.servingWeightGrams)
        : undefined,
  };
}

function per100Pair(per100: number, unit: string, servingWeightGrams: number): NutritionPair {
  const perServing = (per100 * servingWeightGrams) / 100;
  return pair(`${formatNumber(perServing)} ${unit}`, `${formatNumber(per100)} ${unit}`);
}

function per100Nutrition(config: {
  servingWeightGrams: number;
  kcal: number;
  energyKj?: number;
  protein: number;
  fat: number;
  saturatedFat?: number;
  carbs: number;
  sugar?: number;
  ballaststoffe?: number;
  salz?: number;
  polyole?: number;
  glucomannan?: number;
}): VariantNutrition {
  return {
    energyKj:
      typeof config.energyKj === "number"
        ? per100Pair(config.energyKj, "kJ", config.servingWeightGrams)
        : undefined,
    kcal: per100Pair(config.kcal, "kcal", config.servingWeightGrams),
    protein: per100Pair(config.protein, "g", config.servingWeightGrams),
    fat: per100Pair(config.fat, "g", config.servingWeightGrams),
    saturatedFat:
      typeof config.saturatedFat === "number"
        ? per100Pair(config.saturatedFat, "g", config.servingWeightGrams)
        : undefined,
    carbs: per100Pair(config.carbs, "g", config.servingWeightGrams),
    sugar:
      typeof config.sugar === "number"
        ? per100Pair(config.sugar, "g", config.servingWeightGrams)
        : undefined,
    ballaststoffe:
      typeof config.ballaststoffe === "number"
        ? per100Pair(config.ballaststoffe, "g", config.servingWeightGrams)
        : undefined,
    salz:
      typeof config.salz === "number"
        ? per100Pair(config.salz, "g", config.servingWeightGrams)
        : undefined,
    polyole:
      typeof config.polyole === "number"
        ? per100Pair(config.polyole, "g", config.servingWeightGrams)
        : undefined,
    glucomannan:
      typeof config.glucomannan === "number"
        ? per100Pair(config.glucomannan, "g", config.servingWeightGrams)
        : undefined,
  };
}

function parseNumericValue(value: string): number | undefined {
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return undefined;

  const parsed = Number.parseFloat(match[0].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatNutritionValue(
  nutritionPair: NutritionPair | undefined,
  servingLabel: string
): string | undefined {
  if (!nutritionPair) {
    return undefined;
  }

  return `${nutritionPair.perServing} / ${servingLabel}, ${nutritionPair.per100} / 100 g`;
}

function createProductSummary(variant: ProteinBarVariant): ProductSummary {
  return {
    name: variant.name,
    imageUrl: variant.imageUrl,
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: variant.summaryPrice,
    kcal: parseNumericValue(variant.nutrition.kcal.perServing),
    protein: parseNumericValue(variant.nutrition.protein.perServing),
    fat: parseNumericValue(variant.nutrition.fat.perServing),
    carbs: parseNumericValue(variant.nutrition.carbs.perServing),
  };
}

function createProductDetails(variant: ProteinBarVariant): ProductDetailsRecord {
  return {
    marke: variant.marke,
    gewicht: variant.gewicht,
    preis: variant.detailPrice,
    kategorie: "Proteinriegel",
    zutaten: variant.zutaten,
    naehrwerte: {
      energyKj: formatNutritionValue(variant.nutrition.energyKj, variant.servingLabel),
      kcal: formatNutritionValue(variant.nutrition.kcal, variant.servingLabel) || "9999",
      protein: formatNutritionValue(variant.nutrition.protein, variant.servingLabel) || "9999",
      fat: formatNutritionValue(variant.nutrition.fat, variant.servingLabel) || "9999",
      saturatedFat: formatNutritionValue(variant.nutrition.saturatedFat, variant.servingLabel),
      carbs: formatNutritionValue(variant.nutrition.carbs, variant.servingLabel) || "9999",
      sugar: formatNutritionValue(variant.nutrition.sugar, variant.servingLabel),
      ballaststoffe: formatNutritionValue(variant.nutrition.ballaststoffe, variant.servingLabel),
      salz: formatNutritionValue(variant.nutrition.salz, variant.servingLabel),
      glucomannan: formatNutritionValue(variant.nutrition.glucomannan, variant.servingLabel),
      polyole: formatNutritionValue(variant.nutrition.polyole, variant.servingLabel),
    },
    aminosaeurenprofil: [],
    quelle: "online",
  };
}

function designerBarDescription(flavor: string): string {
  return `Offizielle ESN-Produktseite: Soft-Dough-Proteinriegel mit cremigem Kern und knackigem Topping. Geschmacksrichtung: ${flavor}.`;
}

function goatBarDescription(flavor: string): string {
  return `Offizielle ESN-Produktseite: natuerlicher Muelsiriegel mit Eiklarprotein, Haferflocken, Nuessen und Fruechten. Geschmacksrichtung: ${flavor}.`;
}

function moreBarDescription(line: string, flavor: string): string {
  return `Offizielle More-Nutrition-Produktseite: ${line} in der Geschmacksrichtung ${flavor}.`;
}

function officialBarDescription(brand: string, line: string, flavor: string): string {
  return `Offizielle ${brand}-Produktseite: ${line} in der Sorte ${flavor}.`;
}

const ESN_DESIGNER_BAR_VARIANTS: ProteinBarVariant[] = [
  {
    name: "ESN Designer Bar - Almond Coconut",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_AlmondCoconutFlavor_2024x2024_shop-vR2hiYO1_8ba69622-ec3b-4b5e-a91c-38ac88f42cea.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Almond Coconut"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 191,
      protein: 14,
      fat: 11,
      saturatedFat: 5,
      carbs: 15,
      sugar: 2,
      ballaststoffe: 1.3,
      polyole: 12,
    }),
  },
  {
    name: "ESN Designer Bar - Cinnamon Cereal",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_CinnamonCerealFlavor_2024x2024_shop-nSvCXZu_932d9be0-b929-477a-abae-5b11fe4db8f6.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Cinnamon Cereal"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 180,
      protein: 14,
      fat: 8.7,
      saturatedFat: 4.6,
      carbs: 16,
      sugar: 1.8,
      ballaststoffe: 2.2,
      polyole: 13,
    }),
  },
  {
    name: "ESN Designer Bar - Dark Chocolate Salted Almond",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_DarkChocolateSaltedAlmondFlavor_2024x2024_shop-4mvbqa9t_ff7823ec-c07e-4039-80a7-f3bf95d0638a.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Dark Chocolate Salted Almond"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 179,
      protein: 15,
      fat: 9.2,
      saturatedFat: 4,
      carbs: 13,
      sugar: 0.3,
      ballaststoffe: 3.1,
      polyole: 12,
    }),
  },
  {
    name: "ESN Designer Bar - Dark Cookie White Choc",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_DarkCookieWhiteChocFlavor_2024x2024_shop-BIZkYGGC_5ff82805-9cc1-436a-a5da-dc4d21a26286.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Dark Cookie White Choc"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 178,
      protein: 14,
      fat: 8.6,
      saturatedFat: 4.9,
      carbs: 17,
      sugar: 1.6,
      ballaststoffe: 1.6,
      polyole: 14,
    }),
  },
  {
    name: "ESN Designer Bar - Fudge Brownie",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_FudgeBrownieFlavor_2024x2024_shop-J7HtK_vk_9b11199f-c7c3-4427-8d09-a54706b38c73.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Fudge Brownie"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 187,
      protein: 14,
      fat: 10,
      saturatedFat: 5.3,
      carbs: 14,
      sugar: 1.5,
      ballaststoffe: 2,
      polyole: 12,
    }),
  },
  {
    name: "ESN Designer Bar - Hazelnut Nougat",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_HazelnutNougatFlavor_2024x2024_shop-ET2nendt_5f890e73-0059-418d-89d1-a13f30acc5cb.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Hazelnut Nougat"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 186,
      protein: 14,
      fat: 10,
      saturatedFat: 4.3,
      carbs: 15,
      sugar: 2,
      ballaststoffe: 1.8,
      polyole: 12,
    }),
  },
  {
    name: "ESN Designer Bar - Peanut Caramel",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_PeanutCaramelFlavor_2024x2024_shop-1gxdHtjg_700aa965-afed-4da7-8628-83983925a3b4.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Peanut Caramel"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 180,
      protein: 14,
      fat: 8.8,
      saturatedFat: 4.4,
      carbs: 15,
      sugar: 1.8,
      ballaststoffe: 2.8,
      polyole: 10,
    }),
  },
  {
    name: "ESN Designer Bar - Peanut Butter Pretzel",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_PeanutButterPretzelFlavor_2024x2024_shop-cAAVd7Jr_e3a5d784-32da-4907-9f16-7eaa4836b89f.jpg?v=1774017535",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Peanut Butter Pretzel"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 174,
      protein: 14,
      fat: 8.2,
      carbs: 16,
      sugar: 1.7,
      ballaststoffe: 2.7,
    }),
  },
  {
    name: "ESN Designer Bar - Spekulatius",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_SpekulatiusFlavor_2024x2024_shop-azwSr9AO_c88f0cd4-0f01-4485-9e21-298bac3fd171.jpg?v=1773753890",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Spekulatius"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 179,
      protein: 14.9,
      fat: 8.1,
      carbs: 13.5,
      sugar: 1.5,
      ballaststoffe: 2.4,
    }),
  },
  {
    name: "ESN Designer Bar - Lebkuchen",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_Tray_45g_LebkuchenFlavor_2024x2024_shop-ddMCPiOc_8105d583-55ec-4939-a0d5-081e33ff0a19.jpg?v=1773665884",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Lebkuchen"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 167,
      energyKj: 699,
      protein: 14,
      fat: 7.5,
      saturatedFat: 3.5,
      carbs: 15,
      sugar: 0.3,
      ballaststoffe: 3.4,
      salz: 0.23,
    }),
  },
  {
    name: "ESN Designer Bar - Strawberry White Chocolate",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_StrawberryWhiteChocolateFlavor_2024x2024_shop-bJZz9h3U_15c582ce-c6af-4b75-9d8f-7143e7afa139.jpg?v=1773665863",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Strawberry White Chocolate"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 179,
      protein: 15,
      fat: 8.5,
      saturatedFat: 4.3,
      carbs: 15,
      sugar: 2,
      ballaststoffe: 1.4,
      polyole: 13,
    }),
  },
  {
    name: "ESN Designer Bar - Strawberry Yogurt",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_StrawberryYogurtFlavor_2024x2024_shop-2O331kPD_f4de1673-b0fe-4be6-8b6e-e7820f3d04fb.jpg?v=1774018443",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("Strawberry Yogurt"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 179,
      protein: 15,
      fat: 8.7,
      saturatedFat: 4.5,
      carbs: 15,
      sugar: 2,
      ballaststoffe: 1.8,
      polyole: 12,
    }),
  },
  {
    name: "ESN Designer Bar - White Chocolate Pistachio",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_WhiteChocolatePistachioFlavor_2024x2024_shop-zVk2d4vy_8620a7dd-2c80-4c28-b139-43621561eb6e.jpg?v=1773666563",
    summaryPrice: "28,90 EUR",
    detailPrice: "28,90 EUR / 12 x 45 g, einzeln 2,49 EUR / 45 g",
    gewicht: "12 x 45 g (auch einzeln 45 g)",
    servingLabel: "Riegel",
    zutaten: designerBarDescription("White Chocolate Pistachio"),
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      kcal: 183,
      protein: 15,
      fat: 9.1,
      saturatedFat: 4.3,
      carbs: 15,
      sugar: 1.7,
      ballaststoffe: 1.3,
      polyole: 13,
    }),
  },
];
const ESN_GOAT_BAR_VARIANTS: ProteinBarVariant[] = [
  {
    name: "ESN GOAT Bar - Salty Peanut",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/GOAT_Bar_Tray_12x55g_SaltyPeanutFlavor_2024x2024_shop-pEBRAfJA_e9e3f97e-4a5e-458d-830c-ed20b48b8895.jpg?v=1773753727",
    summaryPrice: "32,90 EUR",
    detailPrice: "32,90 EUR / 12 x 55 g, einzeln 2,79 EUR / 55 g",
    gewicht: "12 x 55 g (auch einzeln 55 g)",
    servingLabel: "Riegel",
    zutaten: goatBarDescription("Salty Peanut"),
    nutrition: derivedNutrition({
      servingWeightGrams: 55,
      kcal: 223,
      energyKj: 933,
      protein: 14,
      fat: 7.9,
      carbs: 22,
      sugar: 13,
      ballaststoffe: 4.7,
    }),
  },
  {
    name: "ESN GOAT Bar - Berries",
    marke: "ESN",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/GOAT_Bar_Tray_12x55g_BerriesFlavor_2024x2024_shop-da4wiuV0_735e1791-d8d9-4d7f-bb8c-e01cdd4731eb.jpg?v=1773753727",
    summaryPrice: "32,90 EUR",
    detailPrice: "32,90 EUR / 12 x 55 g, einzeln 2,79 EUR / 55 g",
    gewicht: "12 x 55 g (auch einzeln 55 g)",
    servingLabel: "Riegel",
    zutaten: goatBarDescription("Berries"),
    nutrition: derivedNutrition({
      servingWeightGrams: 55,
      kcal: 204,
      energyKj: 852,
      protein: 14.3,
      fat: 4.8,
      saturatedFat: 1,
      carbs: 23.1,
      sugar: 12.1,
      salz: 0.24,
    }),
  },
];

const MORE_PROTEIN_BAR_VARIANTS: ProteinBarVariant[] = [
  {
    name: "More Protein Bar - Birthday Cake",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Birthday_Cake_Tray_4096x4096-zM7x6M8t_fc717250-14e0-41e9-8f66-b6fe7fb21e1c.png?v=1767605986",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Birthday Cake"),
    nutrition: {
      energyKj: pair("743 kJ", "1485 kJ"),
      kcal: pair("178 kcal", "356 kcal"),
      protein: pair("16 g", "32 g"),
      fat: pair("6,5 g", "13 g"),
      saturatedFat: pair("3,5 g", "7,0 g"),
      carbs: pair("18 g", "35 g"),
      sugar: pair("1,6 g", "3,3 g"),
      ballaststoffe: pair("4,1 g", "8,2 g"),
      salz: pair("0,32 g", "0,63 g"),
      polyole: pair("15 g", "31 g"),
    },
  },
  {
    name: "More Protein Bar - Caramel Crunch",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/more_protein_bar_caramel_crunch_box-xJW6KKG3_bed43479-c5e2-42d6-8ccd-e5a1aaa590d4.png?v=1759652485",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Caramel Crunch"),
    nutrition: {
      energyKj: pair("760 kJ", "1519 kJ"),
      kcal: pair("182 kcal", "364 kcal"),
      protein: pair("16 g", "31 g"),
      fat: pair("7,5 g", "15 g"),
      saturatedFat: pair("3,6 g", "7,3 g"),
      carbs: pair("15 g", "31 g"),
      sugar: pair("1,9 g", "3,9 g"),
      ballaststoffe: pair("5,3 g", "11 g"),
      salz: pair("0,43 g", "0,85 g"),
      polyole: pair("13 g", "26 g"),
    },
  },
  {
    name: "More Protein Bar - Caramel Morezipan",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Caramel_Morezipan_Tray_4096x4096-1usqV1ru_d2e865e9-8dd1-4615-bcd0-40d79a323683.png?v=1761817165",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Caramel Morezipan"),
    nutrition: {
      energyKj: pair("746 kJ", "1492 kJ"),
      kcal: pair("179 kcal", "358 kcal"),
      protein: pair("16 g", "32 g"),
      fat: pair("7,5 g", "15 g"),
      saturatedFat: pair("3,9 g", "7,8 g"),
      carbs: pair("15 g", "30 g"),
      sugar: pair("1,7 g", "3,5 g"),
      ballaststoffe: pair("4,5 g", "9,0 g"),
      salz: pair("0,58 g", "1,17 g"),
      polyole: pair("13 g", "26 g"),
    },
  },
  {
    name: "More Protein Bar - Dark Chocolate Praline Crunch",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Dark_Chocolate_Praline_Crunch_Tray_4096x4096-G0MEPkxb_ea36b65e-231c-4ef9-8b6d-adda3431c935.png?v=1759652485",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Dark Chocolate Praline Crunch"),
    nutrition: {
      energyKj: pair("748 kJ", "1496 kJ"),
      kcal: pair("179 kcal", "359 kcal"),
      protein: pair("16 g", "32 g"),
      fat: pair("7,1 g", "14 g"),
      saturatedFat: pair("3,6 g", "7,1 g"),
      carbs: pair("16 g", "32 g"),
      sugar: pair("0,6 g", "1,2 g"),
      ballaststoffe: pair("4,6 g", "9,2 g"),
      salz: pair("0,34 g", "0,67 g"),
      polyole: pair("14 g", "29 g"),
    },
  },
  {
    name: "More Protein Bar - Milky Candy Cream",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Milky_Candy_Cream_Tray_4096x4096-4JhKabGJ_98b4ffe9-c7da-44b1-8d0f-9088652cf2c9.png?v=1765190356",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Milky Candy Cream"),
    nutrition: {
      energyKj: pair("745 kJ", "1491 kJ"),
      kcal: pair("178 kcal", "356 kcal"),
      protein: pair("19 g", "37 g"),
      fat: pair("6,3 g", "13 g"),
      saturatedFat: pair("3,4 g", "6,8 g"),
      carbs: pair("18 g", "35 g"),
      sugar: pair("2,0 g", "3,9 g"),
      ballaststoffe: pair("0 g", "0,6 g"),
      salz: pair("0,35 g", "0,69 g"),
      polyole: pair("15 g", "31 g"),
    },
  },
  {
    name: "More Protein Bar - Milky Hazelnut Chocolate Cream",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Milky_Hazelnut_Chocolate_Cream_Tray_4096x4096-pVheoHYY_ee466036-1db2-4492-a6f9-e6496b26264b.png?v=1767605952",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Milky Hazelnut Chocolate Cream"),
    nutrition: {
      energyKj: pair("710 kJ", "1421 kJ"),
      kcal: pair("171 kcal", "341 kcal"),
      protein: pair("15 g", "30 g"),
      fat: pair("7,0 g", "14 g"),
      saturatedFat: pair("3,1 g", "6,3 g"),
      carbs: pair("13 g", "27 g"),
      sugar: pair("2,0 g", "4,0 g"),
      ballaststoffe: pair("7,8 g", "16 g"),
      salz: pair("0,26 g", "0,53 g"),
      polyole: pair("11 g", "23 g"),
    },
  },
  {
    name: "More Protein Bar - Peanut Caramel",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/more_protein_bar_peanut_caramel_box-ViVD29sx_5b1f04d2-2c95-498c-b90a-abc9de305da6.png?v=1759652485",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "Peanut Caramel"),
    nutrition: {
      energyKj: pair("794 kJ", "1588 kJ"),
      kcal: pair("191 kcal", "381 kcal"),
      protein: pair("16 g", "33 g"),
      fat: pair("8,7 g", "18 g"),
      saturatedFat: pair("3,9 g", "7,9 g"),
      carbs: pair("14 g", "28 g"),
      sugar: pair("1,7 g", "3,4 g"),
      ballaststoffe: pair("4,7 g", "9,5 g"),
      salz: pair("0,53 g", "1,1 g"),
      polyole: pair("11 g", "23 g"),
    },
  },
  {
    name: "More Protein Bar - White Chocolate Caramel Crunch",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_White_Chocolate_Caramel_Crunch_Tray_2048x2048-8gF4lv8u_0d51dd09-544a-4c16-ac23-7dbeb67a999e.png?v=1759652485",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "White Chocolate Caramel Crunch"),
    nutrition: {
      energyKj: pair("766 kJ", "1533 kJ"),
      kcal: pair("184 kcal", "368 kcal"),
      protein: pair("15 g", "31 g"),
      fat: pair("7,7 g", "15 g"),
      saturatedFat: pair("3,7 g", "7,4 g"),
      carbs: pair("16 g", "32 g"),
      sugar: pair("2,1 g", "4,2 g"),
      ballaststoffe: pair("5,0 g", "10 g"),
      salz: pair("0,45 g", "0,91 g"),
      polyole: pair("14 g", "27 g"),
    },
  },
  {
    name: "More Protein Bar - White Chocolate Coconut",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_White_Chocolate_Coconut_Tray_4096x4096-ku2zZSku_defda07a-e1f3-44e9-815c-5a46e58a2151.png?v=1760348350",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "White Chocolate Coconut"),
    nutrition: {
      energyKj: pair("762 kJ", "1525 kJ"),
      kcal: pair("183 kcal", "366 kcal"),
      protein: pair("16 g", "33 g"),
      fat: pair("7,8 g", "16 g"),
      saturatedFat: pair("3,9 g", "7,8 g"),
      carbs: pair("15 g", "30 g"),
      sugar: pair("1,7 g", "3,4 g"),
      ballaststoffe: pair("4,1 g", "8,2 g"),
      salz: pair("0,42 g", "0,83 g"),
      polyole: pair("13 g", "25 g"),
    },
  },
  {
    name: "More Protein Bar - White Chocolate Peanut Caramel",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/more_protein_bar_white_chocolate_peanut_caramel_box-Dcpv0pQe_f5696f65-24fa-40bd-bdb9-5fc80a659278.png?v=1759315671",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 50 g, einzeln 2,89 EUR / 50 g",
    gewicht: "10 x 50 g (auch einzeln 50 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Bar", "White Chocolate Peanut Caramel"),
    nutrition: {
      energyKj: pair("800 kJ", "1600 kJ"),
      kcal: pair("192 kcal", "384 kcal"),
      protein: pair("16 g", "32 g"),
      fat: pair("9,0 g", "18 g"),
      saturatedFat: pair("3,9 g", "7,9 g"),
      carbs: pair("14 g", "28 g"),
      sugar: pair("1,7 g", "3,4 g"),
      ballaststoffe: pair("4,5 g", "8,9 g"),
      salz: pair("0,53 g", "1,1 g"),
      polyole: pair("12 g", "23 g"),
    },
  },
];

const MORE_PROTEIN_SATISBITES_VARIANTS: ProteinBarVariant[] = [
  {
    name: "More Protein Satisbites - Dark Chocolate Caramel Brownie",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_Dark_Chocolate_Caramel_Brownie_Tray_4096x4096-eHLAIwmQ_07afbd41-34f9-4bc0-a6d7-9bbd275a95c4.png?v=1767606848",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "Dark Chocolate Caramel Brownie"),
    nutrition: {
      energyKj: pair("764 kJ", "1528 kJ"),
      kcal: pair("183 kcal", "365 kcal"),
      protein: pair("14 g", "28 g"),
      fat: pair("8,1 g", "16 g"),
      saturatedFat: pair("4,7 g", "9,4 g"),
      carbs: pair("16 g", "33 g"),
      sugar: pair("0,2 g", "0,4 g"),
      ballaststoffe: pair("5,0 g", "10 g"),
      salz: pair("0,31 g", "0,62 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("14 g", "28 g"),
    },
  },
  {
    name: "More Protein Satisbites - Dark Cookie Crumble",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_Dark_Cookie_Crumble_Tray_4096x4096-ce6kO8NX_5b36a01c-85fe-4e49-8373-774d1d2efa68.png?v=1772031270",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "Dark Cookie Crumble"),
    nutrition: {
      energyKj: pair("790 kJ", "1581 kJ"),
      kcal: pair("189 kcal", "378 kcal"),
      protein: pair("13 g", "26 g"),
      fat: pair("8,9 g", "18 g"),
      saturatedFat: pair("4,8 g", "9,6 g"),
      carbs: pair("17 g", "35 g"),
      sugar: pair("1,6 g", "3,3 g"),
      ballaststoffe: pair("4,6 g", "9,2 g"),
      salz: pair("0,33 g", "0,66 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("14 g", "27 g"),
    },
  },
  {
    name: "More Protein Satisbites - Lebkuchen",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_Lebkuchen_Tray_4096x4096-D5K_G7Sa_36a7faba-1fcf-499e-999f-d2582299bc0e.png?v=1761306385",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "Lebkuchen"),
    nutrition: {
      energyKj: pair("773 kJ", "1546 kJ"),
      kcal: pair("184 kcal", "369 kcal"),
      protein: pair("15 g", "30 g"),
      fat: pair("8,2 g", "16 g"),
      saturatedFat: pair("4,0 g", "8,0 g"),
      carbs: pair("17 g", "34 g"),
      sugar: pair("1,6 g", "3,2 g"),
      ballaststoffe: pair("4,0 g", "7,9 g"),
      salz: pair("0,24 g", "0,47 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("12 g", "23 g"),
    },
  },
  {
    name: "More Protein Satisbites - Milk Chocolate Coconut",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_Milk_Chocolate_Coconut_Tray_4096x4096-hRrP-jH2_ae74135f-3bfd-480c-b1fd-4fa69cd46065.png?v=1770030552",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "Milk Chocolate Coconut"),
    nutrition: {
      energyKj: pair("825 kJ", "1649 kJ"),
      kcal: pair("198 kcal", "396 kcal"),
      protein: pair("15 g", "31 g"),
      fat: pair("11 g", "21 g"),
      saturatedFat: pair("5,6 g", "11 g"),
      carbs: pair("15 g", "29 g"),
      sugar: pair("1,5 g", "3,0 g"),
      ballaststoffe: pair("3,3 g", "6,6 g"),
      salz: pair("0,22 g", "0,44 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("13 g", "25 g"),
    },
  },
  {
    name: "More Protein Satisbites - Milk Chocolate Pistachio",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_Milk_Chocolate_Pistachio_Tray_4096x4096-G9K2W3FK_1654bb96-0a12-4508-aa91-145d57e34bf4.png?v=1761306385",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "Milk Chocolate Pistachio"),
    nutrition: {
      energyKj: pair("834 kJ", "1669 kJ"),
      kcal: pair("199 kcal", "399 kcal"),
      protein: pair("16 g", "31 g"),
      fat: pair("10 g", "20 g"),
      saturatedFat: pair("4,7 g", "9,5 g"),
      carbs: pair("16 g", "31 g"),
      sugar: pair("1,7 g", "3,4 g"),
      ballaststoffe: pair("2,7 g", "5,4 g"),
      salz: pair("0,18 g", "0,36 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("14 g", "27 g"),
    },
  },
  {
    name: "More Protein Satisbites - White Chocolate Blueberry Cheesecake",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_White_Chocolate_Blueberry_Cheesecake_Tray_4096x4096_DE_1-RjX5OSwE_a3b1bcf7-70a9-4b08-b7f5-27103b4a55ae.png?v=1772180646",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription(
      "More Protein Satisbites",
      "White Chocolate Blueberry Cheesecake"
    ),
    nutrition: {
      energyKj: pair("758 kJ", "1516 kJ"),
      kcal: pair("181 kcal", "361 kcal"),
      protein: pair("15 g", "29 g"),
      fat: pair("6,8 g", "14 g"),
      saturatedFat: pair("3,6 g", "7,3 g"),
      carbs: pair("21 g", "41 g"),
      sugar: pair("1,6 g", "3,2 g"),
      ballaststoffe: pair("2,3 g", "4,5 g"),
      salz: pair("0,24 g", "0,48 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("14 g", "29 g"),
    },
  },
  {
    name: "More Protein Satisbites - White Chocolate Strawberry Cream",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_White_Chocolate_Strawberry_Cream_Tray_4096x4096-sfo4iJPb_00b87f91-34be-43ae-8001-823a9ec32a0d.png?v=1772030394",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "White Chocolate Strawberry Cream"),
    nutrition: {
      energyKj: pair("809 kJ", "1619 kJ"),
      kcal: pair("193 kcal", "386 kcal"),
      protein: pair("15 g", "30 g"),
      fat: pair("8,9 g", "18 g"),
      saturatedFat: pair("4,5 g", "9,0 g"),
      carbs: pair("17 g", "34 g"),
      sugar: pair("2,6 g", "5,1 g"),
      ballaststoffe: pair("3,0 g", "6,0 g"),
      salz: pair("0,19 g", "0,39 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("14 g", "28 g"),
    },
  },
  {
    name: "More Protein Satisbites - White Hazelnut Nougat",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_White_Hazelnut_Nougat_Tray_4096x4096-pvTNZm2C_a18bcd86-0450-4baf-af8b-4738286723f6.png?v=1772030419",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "White Hazelnut Nougat"),
    nutrition: {
      energyKj: pair("824 kJ", "1649 kJ"),
      kcal: pair("197 kcal", "394 kcal"),
      protein: pair("15 g", "31 g"),
      fat: pair("9,9 g", "20 g"),
      saturatedFat: pair("3,9 g", "7,7 g"),
      carbs: pair("15 g", "31 g"),
      sugar: pair("1,9 g", "3,9 g"),
      ballaststoffe: pair("2,7 g", "5,4 g"),
      salz: pair("0,19 g", "0,38 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("13 g", "27 g"),
    },
  },
  {
    name: "More Protein Satisbites - Zimtstern",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/More_Protein_Satisbites_Zimtstern_Tray_4096x4096-sYHUNC7X_9f71900a-5d6f-4d39-996d-68c9c7557eac.png?v=1761306385",
    summaryPrice: "34,49 EUR",
    detailPrice: "34,49 EUR / 12 x 2 x 25 g, einzeln 2,89 EUR / 2 x 25 g",
    gewicht: "12 x 2 x 25 g (auch einzeln 2 x 25 g)",
    servingLabel: "Portion",
    zutaten: moreBarDescription("More Protein Satisbites", "Zimtstern"),
    nutrition: {
      energyKj: pair("798 kJ", "1596 kJ"),
      kcal: pair("191 kcal", "381 kcal"),
      protein: pair("14 g", "29 g"),
      fat: pair("8,7 g", "17 g"),
      saturatedFat: pair("4,4 g", "8,7 g"),
      carbs: pair("19 g", "38 g"),
      sugar: pair("1,6 g", "3,1 g"),
      ballaststoffe: pair("3,8 g", "7,6 g"),
      salz: pair("0,24 g", "0,49 g"),
      glucomannan: pair("1,0 g", "2,0 g"),
      polyole: pair("15 g", "29 g"),
    },
  },
];

const MORE_VEGAN_PROTEIN_BAR_VARIANTS: ProteinBarVariant[] = [
  {
    name: "More Vegan Protein Bar - Hazelnut Nougat",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Vegan_Hazelnut_Nougat_Tray_4096x4096-43d6FmC6_c2f50f6c-9b2e-45fd-9a73-d25b5786f6d9.png?v=1762956552",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 55 g, einzeln 2,89 EUR / 55 g",
    gewicht: "10 x 55 g (auch einzeln 55 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Vegan Protein Bar", "Hazelnut Nougat"),
    nutrition: {
      energyKj: pair("829 kJ", "1507 kJ"),
      kcal: pair("199 kcal", "362 kcal"),
      protein: pair("15 g", "28 g"),
      fat: pair("9,0 g", "17 g"),
      saturatedFat: pair("3,6 g", "6,6 g"),
      carbs: pair("19 g", "34 g"),
      sugar: pair("0,9 g", "1,6 g"),
      ballaststoffe: pair("4,9 g", "9,0 g"),
      salz: pair("0,49 g", "0,89 g"),
      polyole: pair("17 g", "31 g"),
    },
  },
  {
    name: "More Vegan Protein Bar - Morezipan Almond Cake",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Vegan_Morezipan_Almond_Cake_Tray_4096x4096-mQ5nhVGJ_3135a541-63a7-4588-9683-dc029bafd3ee.png?v=1761650647",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 55 g, einzeln 2,89 EUR / 55 g",
    gewicht: "10 x 55 g (auch einzeln 55 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Vegan Protein Bar", "Morezipan Almond Cake"),
    nutrition: {
      energyKj: pair("828 kJ", "1506 kJ"),
      kcal: pair("199 kcal", "362 kcal"),
      protein: pair("16 g", "29 g"),
      fat: pair("9,0 g", "16 g"),
      saturatedFat: pair("3,8 g", "6,9 g"),
      carbs: pair("17 g", "31 g"),
      sugar: pair("0,8 g", "1,5 g"),
      ballaststoffe: pair("5,5 g", "10 g"),
      salz: pair("0,49 g", "0,89 g"),
      polyole: pair("15 g", "28 g"),
    },
  },
  {
    name: "More Vegan Protein Bar - Peanut Butter",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Vegan_Peanut_Butter_Tray_4096x4096-n6SUBGQq_52d720da-07d2-46dc-8b3f-f2ee0ff64bbd.png?v=1760426649",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 10 x 55 g, einzeln 2,89 EUR / 55 g",
    gewicht: "10 x 55 g (auch einzeln 55 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Vegan Protein Bar", "Peanut Butter"),
    nutrition: {
      energyKj: pair("826 kJ", "1502 kJ"),
      kcal: pair("199 kcal", "362 kcal"),
      protein: pair("16 g", "29 g"),
      fat: pair("9,2 g", "17 g"),
      saturatedFat: pair("3,3 g", "6,1 g"),
      carbs: pair("18 g", "33 g"),
      sugar: pair("0,8 g", "1,5 g"),
      ballaststoffe: pair("4,4 g", "7,9 g"),
      salz: pair("0,48 g", "0,88 g"),
      polyole: pair("16 g", "29 g"),
    },
  },
  {
    name: "More Vegan Protein Bar - Spekulatius",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Vegan_Spekulatius_Tray_4096x4096-Mxk4JBlG_472f4740-b132-4abb-8190-152979ea691e.png?v=1763383157",
    summaryPrice: "17,25 EUR",
    detailPrice: "17,25 EUR / 12 x 55 g, einzeln 1,45 EUR / 55 g",
    gewicht: "12 x 55 g (auch einzeln 55 g)",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Vegan Protein Bar", "Spekulatius"),
    nutrition: {
      energyKj: pair("826 kJ", "1501 kJ"),
      kcal: pair("199 kcal", "361 kcal"),
      protein: pair("13 g", "23 g"),
      fat: pair("8,8 g", "16 g"),
      saturatedFat: pair("4,6 g", "8,3 g"),
      carbs: pair("15 g", "28 g"),
      sugar: pair("1,8 g", "3,3 g"),
      ballaststoffe: pair("12 g", "21 g"),
      salz: pair("0,50 g", "0,91 g"),
      polyole: pair("11 g", "19 g"),
    },
  },
];

const MORE_WAFER_BAR_VARIANTS: ProteinBarVariant[] = [
  {
    name: "More Protein Wafer Bar - Milk Chocolate Hazelnut",
    marke: "More Nutrition",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Wafer_Bar_Milk_Chocolate_Hazelnut_Tray_4096x4096-0biR3Aqk_9d2b825e-ea88-4e73-8acb-ebd0819f36b5.png?v=1767606848",
    summaryPrice: "16,99 EUR",
    detailPrice: "16,99 EUR / 6 x 30 g",
    gewicht: "6 x 30 g",
    servingLabel: "Riegel",
    zutaten: moreBarDescription("More Protein Wafer Bar", "Milk Chocolate Hazelnut"),
    nutrition: {
      energyKj: pair("613 kJ", "2042 kJ"),
      kcal: pair("148 kcal", "493 kcal"),
      protein: pair("8,1 g", "27 g"),
      fat: pair("9,3 g", "31 g"),
      saturatedFat: pair("3,9 g", "13 g"),
      carbs: pair("7,8 g", "26 g"),
      sugar: pair("1,6 g", "5,2 g"),
      ballaststoffe: pair("2,6 g", "8,5 g"),
      salz: pair("0,05 g", "0,15 g"),
      polyole: pair("4,8 g", "16 g"),
    },
  },
];

const ADDITIONAL_BRAND_PROTEIN_BAR_VARIANTS: ProteinBarVariant[] = [
  {
    name: "KoRo Protein Bar - Chocolate Caramel",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/f0/33/7b/1740441097/PROTEIN_060_MAIN.jpg?auto=format%2Ccompress&cs=srgb&fit=max&w=3000",
    summaryPrice: "2,90 EUR",
    detailPrice: "2,90 EUR / 60 g",
    gewicht: "60 g",
    servingLabel: "Riegel",
    zutaten:
      "Suessungsmittel: Maltit; Feuchthaltemittel: Glycerin; Calciumcaseinat, Molkeneiweissisolat, Fuellstoff: Polydextrose; Kakaobutter, Vollmilchpulver, Sojaproteinisolat, Wasser, Kollagenhydrolysat, Kakaomasse, Oligofructose, Dextrin (Weizen), Rapsoel, Mandeleiweiss, Kokosoel, natuerliches Aroma, Tapiokastaerke, Salz, Erbsenprotein, Emulgator: Sojalecithin, Mono- und Diglyceride von Speisefettsaeuren; modifizierte Maisstaerke, Stabilisator: Calciumcarbonat; natuerliches Vanillearoma, Saeureregulator: Natriumcitrat; Suessungsmittel: Sucralose.",
    nutrition: {
      energyKj: pair("917 kJ", "1528 kJ"),
      kcal: pair("222 kcal", "367 kcal"),
      protein: pair("18,6 g", "31 g"),
      fat: pair("9,6 g", "16 g"),
      saturatedFat: pair("5,1 g", "8,5 g"),
      carbs: pair("17,4 g", "29 g"),
      sugar: pair("1,9 g", "3,2 g"),
      ballaststoffe: pair("6,0 g", "10 g"),
      salz: pair("0,34 g", "0,56 g"),
    },
  },
  {
    name: "PowerBar 52% Protein+ - Cookies & Cream",
    marke: "PowerBar",
    imageUrl:
      "https://www.powerbar.com/cdn/shop/files/e87662c21b1247eb8888433f11c7ce26_bb853776-9673-4018-b1b6-6b1b6d82b3ff.png?v=1760521897&width=3840",
    summaryPrice: "11,95 EUR",
    detailPrice: "11,95 EUR / 4 x 50 g",
    gewicht: "4 x 50 g",
    servingLabel: "Riegel",
    zutaten:
      "Milcheiweiss (Calciumcaseinat, Molkeneiweissisolat), Milchschokoladenkuvertuere mit Suessungsmittel (18 %) [Suessungsmittel (Maltit), Kakaobutter, Vollmilchpulver, Kakaomasse, Emulgator (Lecithine (Soja)), Aroma], Feuchthaltemittel (Glycerin), Kollagenhydrolysat, Sojaeiweiss, Wasser, Sojacrispies (5 %) (Sojaeiweiss, fettarmes Kakaopulver, Staerke), Aroma, Suessungsmittel (Sucralose), Emulgator [Lecithine (Soja)]. Kann enthalten: Weizen, Gerste, Hafer, Erdnuesse, Haselnuesse, Mandeln, Cashewnuesse, Pistazien.",
    nutrition: {
      energyKj: pair("693 kJ", "1386 kJ"),
      kcal: pair("165 kcal", "330 kcal"),
      protein: pair("26 g", "52 g"),
      fat: pair("3,4 g", "6,8 g"),
      saturatedFat: pair("2,0 g", "4,0 g"),
      carbs: pair("12 g", "24 g"),
      sugar: pair("0,7 g", "1,4 g"),
      salz: pair("0,46 g", "0,91 g"),
      polyole: pair("11 g", "22 g"),
    },
  },
  {
    name: "Barebells Protein Bar - Salty Caramel Crunch",
    marke: "Barebells",
    imageUrl: "https://barebells.de/wp-content/uploads/sites/3/2025/12/BB_Bars_Caramel_Crunch.png",
    summaryPrice: "27,99 EUR",
    detailPrice: "27,99 EUR / 12 x 55 g",
    gewicht: "12 x 55 g",
    servingLabel: "Riegel",
    zutaten:
      "Milcheiweiss, Kollagen-Hydrolysat, Feuchthaltemittel (Glycerin), Suessungsmittel (Maltit), Polydextrose, Kakaobutter, Vollmilchpulver, Sojaprotein, Wasser, Sonnenblumenoel, Kakaomasse, Maisstuecken, Salz, Aromen, Emulgator (Lecithine), Suessungsmittel (Sucralose). Kann Spuren von glutenhaltigem Getreide, Erdnussen und Schalenfruechten enthalten.",
    nutrition: {
      energyKj: pair("836 kJ", "1520 kJ"),
      kcal: pair("200 kcal", "363 kcal"),
      protein: pair("20 g", "37 g"),
      fat: pair("7,5 g", "14 g"),
      saturatedFat: pair("3,6 g", "6,6 g"),
      carbs: pair("17 g", "31 g"),
      sugar: pair("1,3 g", "2,4 g"),
      ballaststoffe: pair("3,3 g", "5,9 g"),
      salz: pair("0,71 g", "1,3 g"),
    },
  },
  {
    name: "Sportness Proteinriegel 50% - Fudgy Brownie",
    marke: "dm / Sportness",
    imageUrl:
      "https://products.dm-static.com/images/f_auto%2Cq_auto%2Cc_fit%2Ch_440%2Cw_500/v1755093610/assets/pas/images/14beb9d5-59b0-43c0-9400-2be679f72f36/sportness-proteinriegel-50-prozent-fudgy-brownie-geschmack",
    summaryPrice: "0,85 EUR",
    detailPrice: "0,85 EUR / 45 g",
    gewicht: "45 g",
    servingLabel: "Riegel",
    zutaten:
      "Milcheiweiss, Kollagenhydrolysat, 18,9 % Maltit-Vollmilchschokolade mit Suessungsmittel (Suessungsmittel: Maltit; Kakaobutter, Vollmilchpulver, Kakaomasse, Emulgator: Sojalecithine; Aroma), Feuchthaltemittel: Glycerin; Wasser, kakaohaltige Sojaeiweiss-Crispies (Sojaeiweiss, fettarmes Kakaopulver, Tapiokastaerke), Sojaeiweissisolat, 1,6 % fettarmes Kakaopulver, Sojaoel, Aroma, Palmfett, Salz, Verdickungsmittel: Gummi arabicum; Emulgator: Sojalecithine; Suessungsmittel: Sucralose.",
    nutrition: derivedNutrition({
      servingWeightGrams: 45,
      energyKj: 667.35,
      kcal: 158.85,
      protein: 22.5,
      fat: 4.095,
      saturatedFat: 2.475,
      carbs: 11.7,
      sugar: 1.125,
      ballaststoffe: 0.54,
      salz: 0.4365,
      polyole: 10.125,
    }),
  },
  {
    name: "Bodylab Deluxe Protein Bar - Banana Chocolate",
    marke: "Bodylab24",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0660/5412/7022/files/bodylab-deluxe-protein-bar-banana-chocolate.jpg?v=1739186135",
    summaryPrice: "28,99 EUR",
    detailPrice: "28,99 EUR / 12 x 50 g",
    gewicht: "12 x 50 g",
    servingLabel: "Riegel",
    zutaten:
      "22 % Vollmilchschokolade mit Suessungsmittel (Suessungsmittel: Maltit; Kakaobutter, Vollmilchpulver, Kakaomasse, Emulgator: Sojalecithine; Aroma), Schicht mit Schokoladenaroma (loesliche Maisfaser, Feuchthaltemittel: Glycerin; Milcheiweiss, Suessungsmittel: Maltit; Kakaobutter, Vollmilchpulver, Kakaomasse, Emulgator: Sojalecithine; Salz, Aroma), Milcheiweiss, Fuellstoff: Polydextrose; Suessungsmittel: Maltit, Sucralose; Feuchthaltemittel: Glycerin; hydrolysiertes Kollagen, Wasser, Sojaoel, Emulgator: Sojalecithine; Salz, Aroma, Farbstoff: Carotin.",
    nutrition: {
      energyKj: pair("719,65 kJ", "1439,3 kJ"),
      kcal: pair("172 kcal", "344 kcal"),
      protein: pair("11 g", "22 g"),
      fat: pair("7,5 g", "15 g"),
      saturatedFat: pair("3,4 g", "6,8 g"),
      carbs: pair("17 g", "34 g"),
      sugar: pair("1,8 g", "3,6 g"),
      ballaststoffe: pair("6,2 g", "12,4 g"),
      salz: pair("0,28 g", "0,56 g"),
    },
  },
  {
    name: "IronMaxx Zenith 50 Protein Bar - Brownie Chocolate Crisp",
    marke: "IronMaxx",
    imageUrl:
      "https://www.ironmaxx.de/cdn/shop/files/IronMaxx_Zenith_50_Brownie_45g_copy_794e8238-abbc-4db1-ba2f-53c699954e18.png?v=1751902769&width=400",
    summaryPrice: "1,99 EUR",
    detailPrice: "1,99 EUR / 45 g",
    gewicht: "45 g",
    servingLabel: "Riegel",
    zutaten:
      "Milcheiweissmischung (Calciumcaseinat, Molkeneiweisskonzentrat, Molkeneiweissisolat), Feuchthaltemittel (Glycerin), Kollagenhydrolysat, Maltit-Vollmilchschokoladenkuvertuere (13 %) (Suessungsmittel (Maltit), Kakaobutter, Vollmilchpulver, Kakaomasse, Emulgator (Lecithin (Soja)), natuerliches Vanille-Aroma), Sojaeiweissisolat, Sojaeiweiss-Nuggets (5 %) (Sojaeiweissisolat, Kakao (10 %), Tapiokastaerke), Palmfett, Kakaopulver (2 %), Aroma, Inulin, Salz, Suessungsmittel (Sucralose), Emulgator (Lecithin), Antioxidationsmittel (DL-alpha-Tocopherol). Kann Spuren enthalten von Ei und Schalenfruechten.",
    nutrition: {
      energyKj: pair("690 kJ", "1534 kJ"),
      kcal: pair("164 kcal", "365 kcal"),
      protein: pair("23 g", "50 g"),
      fat: pair("4,4 g", "9,9 g"),
      saturatedFat: pair("2,6 g", "5,7 g"),
      carbs: pair("13 g", "29 g"),
      sugar: pair("0,6 g", "1,4 g"),
      salz: pair("0,25 g", "0,56 g"),
    },
  },
  {
    name: "ahead Protein Bar - Peanut Caramel",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/Peanut_Caramel_front.png?v=1739277480&width=1200",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten:
      "Milchproteine, Suessungsmittel: Maltitol; Polydextrose, Feuchthaltemittel: Glycerin; Kakaobutter, 8,8 % geroestete Erdnussstuecke, Vollmilchpulver, Kollagenhydrolysat, Kakaomasse, Wasser, Sonnenblumenoel, Konzentrat (karamellisierte Karotte, Karotte, Apfel, schwarze Johannisbeere), Meersalz, Aroma, Emulgator: Lecithine, natuerliche Aromen. Kann enthalten sein: glutenhaltiges Getreide, Sojabohnen und Nuesse.",
    nutrition: {
      energyKj: pair("745 kJ", "1655 kJ"),
      kcal: pair("179 kcal", "398 kcal"),
      protein: pair("12 g", "27 g"),
      fat: pair("9,3 g", "21 g"),
      saturatedFat: pair("4,3 g", "9,5 g"),
      carbs: pair("15 g", "33 g"),
      sugar: pair("1,7 g", "3,7 g"),
      ballaststoffe: pair("3,5 g", "7,8 g"),
      salz: pair("0,17 g", "0,38 g"),
      polyole: pair("12 g", "27 g"),
    },
  },
  {
    name: "PowerXSystem Whey Choc Bar - White Chocolate",
    marke: "PowerXSystem",
    imageUrl:
      "https://power-system-shop.com/cdn/shop/files/Proteinriegel_Whey_Choc_f113573a-ba26-47cf-b532-b83d45c74c7d.jpg?v=1765200795&width=2100",
    summaryPrice: "4,89 EUR",
    detailPrice: "4,89 EUR / 12 x 35 g",
    gewicht: "12 x 35 g",
    servingLabel: "Riegel",
    zutaten:
      "Milcheiweissmischung (Milcheiweiss, Molkeneiweisskonzentrat), Suessungsmittel (Maltit), Feuchthaltemittel (Glycerin), Wasser, Kakaobutter, Vollmilchpulver, oligofructosereicher Sirup, hydrolysiertes Kollagen, Sojaeiweissisolat, Weizenknusper (Weizenmehl, Reismehl, Zuckersirup, Malzextrakt, Salz), Sonnenblumenoel, Magermilchpulver, Emulgator (Sojalecithine), Aroma, Suessungsmittel (Sucralose).",
    nutrition: derivedNutrition({
      servingWeightGrams: 35,
      energyKj: 467.25,
      kcal: 111.65,
      protein: 10.5,
      fat: 3.5,
      saturatedFat: 1.82,
      carbs: 13.3,
      sugar: 0.63,
      salz: 0.3325,
    }),
  },
  {
    name: "Snickers Hi Protein Crisp",
    marke: "Mars / Snickers",
    imageUrl: "https://usfoodz.eu/cdn/shop/products/Snickers-Hi-Protein-Crisp_1000x1000.jpg?v=1656094574",
    summaryPrice: "1,99 EUR",
    detailPrice: "1,99 EUR / 55 g",
    gewicht: "55 g",
    servingLabel: "Riegel",
    zutaten:
      "Milk chocolate (16 %) (sugar, cocoa butter, skimmed milk powder, cocoa mass, lactose and protein from whey (milk), palm fat, whey powder, milk fat, emulsifier (soy lecithin), natural vanilla flavor), milk protein, collagen hydrolysate, caramel layer (11 %) (glucose syrup, sugar, condensed milk, invert sugar syrup, cocoa butter, humectant (glycerol), emulsifier (mono- and diglycerides), flavor, salt, coloring (pure caramel)), peanuts (9 %), humectant (glycerol), water, oligofructose, soy protein, coconut fat, whey protein, soy crispies (2,5 %) (soy protein, rice flour, barley malt extract, salt), peanut paste, flavourings, color (regular caramel).",
    nutrition: {
      energyKj: pair("908 kJ", "1650 kJ"),
      kcal: pair("217 kcal", "388 kcal"),
      protein: pair("20 g", "37 g"),
      fat: pair("8,2 g", "15 g"),
      saturatedFat: pair("3,6 g", "6,5 g"),
      carbs: pair("15 g", "28 g"),
      sugar: pair("8,4 g", "15 g"),
      salz: pair("0,26 g", "0,46 g"),
    },
  },
  {
    name: "KoRo Protein Bar - Schokolade Brownie",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/44/95/db/1744900915/PROTEIN-040.jpg?auto=format%2Ccompress&cs=srgb&fit=max&w=3000",
    summaryPrice: "2,50 EUR",
    detailPrice: "2,50 EUR / 55 g",
    gewicht: "55 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("KoRo", "Veganer Proteinriegel", "Schokolade Brownie"),
    nutrition: per100Nutrition({
      servingWeightGrams: 55,
      energyKj: 1571,
      kcal: 379,
      protein: 27,
      fat: 16,
      saturatedFat: 6.6,
      carbs: 27,
      sugar: 1.9,
      ballaststoffe: 14,
      salz: 0.86,
    }),
  },
  {
    name: "KoRo Protein Bar Deluxe Vegan - Raspberry Choc",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/64/06/df/1747996922/PROTEIN_058.jpg?auto=format%2Ccompress&cs=srgb&fit=max&w=3000",
    summaryPrice: "2,80 EUR",
    detailPrice: "2,80 EUR / 55 g",
    gewicht: "55 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("KoRo", "Protein Bar Deluxe Vegan", "Raspberry Choc"),
    nutrition: per100Nutrition({
      servingWeightGrams: 55,
      energyKj: 1541,
      kcal: 372,
      protein: 26,
      fat: 14,
      saturatedFat: 7.7,
      carbs: 32,
      sugar: 0.8,
      ballaststoffe: 9.8,
      salz: 0.7,
    }),
  },
  {
    name: "KoRo Veganer Bio Proteinriegel - Haselnuss",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/b2/8d/39/1737712461/PROTEIN_018.png?auto=format%2Ccompress&cs=srgb&fit=max&w=3000",
    summaryPrice: "2,30 EUR",
    detailPrice: "2,30 EUR / 60 g",
    gewicht: "60 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("KoRo", "Veganer Bio Proteinriegel", "Haselnuss"),
    nutrition: per100Nutrition({
      servingWeightGrams: 60,
      energyKj: 1528,
      kcal: 366,
      protein: 24,
      fat: 17,
      saturatedFat: 5.7,
      carbs: 26,
      sugar: 14,
      ballaststoffe: 6.5,
      salz: 0.31,
    }),
  },
  {
    name: "KoRo Protein Bar Deluxe - White Chocolate Hazelnut",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/eb/28/ca/1747412174/PROTEIN_057.jpg?auto=format%2Ccompress&cs=srgb&fit=max&w=3000",
    summaryPrice: "2,80 EUR",
    detailPrice: "2,80 EUR / 55 g",
    gewicht: "55 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("KoRo", "Protein Bar Deluxe", "White Chocolate Hazelnut"),
    nutrition: per100Nutrition({
      servingWeightGrams: 55,
      energyKj: 1681,
      kcal: 403,
      protein: 27,
      fat: 18,
      saturatedFat: 7.4,
      carbs: 30,
      sugar: 4.4,
      ballaststoffe: 10,
      salz: 0.69,
    }),
  },
  {
    name: "KoRo Crispy Protein Bar - Dark Chocolate",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/b7/46/e7/1737708455/PROTEIN_019.jpg?auto=format%2Ccompress&cs=srgb&fit=max&w=3000",
    summaryPrice: "2,30 EUR",
    detailPrice: "2,30 EUR / 60 g",
    gewicht: "60 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("KoRo", "Crispy Protein Bar", "Dark Chocolate"),
    nutrition: per100Nutrition({
      servingWeightGrams: 60,
      energyKj: 1596,
      kcal: 383,
      protein: 27,
      fat: 17,
      saturatedFat: 7.5,
      carbs: 29,
      sugar: 0.8,
      ballaststoffe: 10,
      salz: 0.64,
    }),
  },
  {
    name: "KoRo Crispy Protein Bar - Peanut",
    marke: "KoRo",
    imageUrl:
      "https://koro.imgix.net/media/9c/20/02/1735901814/PROTEIN_062_MAIN.jpg?w=3000&auto=format,compress&fit=max&cs=srgb",
    summaryPrice: "2,90 EUR",
    detailPrice: "2,90 EUR / 60 g",
    gewicht: "60 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("KoRo", "Crispy Protein Bar", "Peanut"),
    nutrition: per100Nutrition({
      servingWeightGrams: 60,
      energyKj: 1733,
      kcal: 417,
      protein: 26,
      fat: 20,
      saturatedFat: 7.4,
      carbs: 29,
      sugar: 2.7,
      ballaststoffe: 12,
      salz: 0.67,
    }),
  },
  {
    name: "ahead Protein Bar - Cookies & Cream",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/Cookies_Cream_front.png?v=1739277483&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Cookies & Cream"),
    nutrition: {
      energyKj: pair("740 kJ", "1645 kJ"),
      kcal: pair("177 kcal", "393 kcal"),
      protein: pair("12 g", "27 g"),
      fat: pair("9,1 g", "20 g"),
      saturatedFat: pair("4,4 g", "9,8 g"),
      carbs: pair("15 g", "34 g"),
      sugar: pair("1,5 g", "3,4 g"),
      ballaststoffe: pair("3,7 g", "8,2 g"),
      salz: pair("0,12 g", "0,28 g"),
      polyole: pair("12 g", "26 g"),
    },
  },
  {
    name: "ahead Protein Bar - Fudge Brownie",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/Fudge_Brownie_front.png?v=1739277482&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Fudge Brownie"),
    nutrition: {
      energyKj: pair("713 kJ", "1584 kJ"),
      kcal: pair("171 kcal", "379 kcal"),
      protein: pair("13 g", "29 g"),
      fat: pair("8,2 g", "18 g"),
      saturatedFat: pair("4,1 g", "9,1 g"),
      carbs: pair("15 g", "33 g"),
      sugar: pair("1,2 g", "2,7 g"),
      ballaststoffe: pair("4,7 g", "10 g"),
      salz: pair("0,11 g", "0,25 g"),
      polyole: pair("11 g", "24 g"),
    },
  },
  {
    name: "ahead Protein Bar - Hazelnut Nougat",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/Hazelnut_Nougat_front.png?v=1739277480&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Hazelnut Nougat"),
    nutrition: {
      energyKj: pair("731 kJ", "1625 kJ"),
      kcal: pair("175 kcal", "389 kcal"),
      protein: pair("13 g", "28 g"),
      fat: pair("8,8 g", "20 g"),
      saturatedFat: pair("3,6 g", "8,1 g"),
      carbs: pair("15 g", "34 g"),
      sugar: pair("1,5 g", "3,4 g"),
      ballaststoffe: pair("4,0 g", "8,8 g"),
      salz: pair("0,12 g", "0,28 g"),
      polyole: pair("11 g", "25 g"),
    },
  },
  {
    name: "ahead Protein Bar - Coconut Almond",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/PDP_01_29f3cfe4-6d9a-4506-b549-8e672f50369b.png?v=1755874540&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Coconut Almond"),
    nutrition: {
      energyKj: pair("701 kJ", "1558 kJ"),
      kcal: pair("168 kcal", "373 kcal"),
      protein: pair("12 g", "27 g"),
      fat: pair("7,7 g", "17 g"),
      saturatedFat: pair("3,5 g", "7,7 g"),
      carbs: pair("15 g", "33 g"),
      sugar: pair("1,5 g", "3,2 g"),
      ballaststoffe: pair("5,7 g", "13 g"),
      salz: pair("0,12 g", "0,28 g"),
      polyole: pair("10 g", "23 g"),
    },
  },
  {
    name: "ahead Protein Bar - Dominostein",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/PDP_01_8_a44c9137-ce0c-47ba-b4f0-5539e7c08481.jpg?v=1760591146&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Dominostein"),
    nutrition: {
      energyKj: pair("769 kJ", "1708 kJ"),
      kcal: pair("184 kcal", "409 kcal"),
      protein: pair("12 g", "27 g"),
      fat: pair("9,7 g", "22 g"),
      saturatedFat: pair("4,2 g", "9,4 g"),
      carbs: pair("15 g", "34 g"),
      sugar: pair("1,7 g", "3,9 g"),
      ballaststoffe: pair("3,5 g", "7,8 g"),
      salz: pair("0,16 g", "0,35 g"),
      polyole: pair("12 g", "26 g"),
    },
  },
  {
    name: "ahead Protein Bar - Lemon Cheesecake",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/PDP_01.png?v=1755874537&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Lemon Cheesecake"),
    nutrition: {
      energyKj: pair("700 kJ", "1555 kJ"),
      kcal: pair("167 kcal", "372 kcal"),
      protein: pair("12 g", "27 g"),
      fat: pair("7,4 g", "16 g"),
      saturatedFat: pair("3,3 g", "7,3 g"),
      carbs: pair("15 g", "34 g"),
      sugar: pair("1,6 g", "3,6 g"),
      ballaststoffe: pair("5,6 g", "13 g"),
      salz: pair("0,12 g", "0,28 g"),
      polyole: pair("10 g", "23 g"),
    },
  },
  {
    name: "ahead Protein Bar - Linzer Cookie",
    marke: "ahead",
    imageUrl:
      "https://www.ahead-nutrition.com/cdn/shop/files/PDP_01_d1a5ae28-06a9-4e31-8101-9edbcf20433a.png?v=1761581734&width=160",
    summaryPrice: "31,99 EUR",
    detailPrice: "31,99 EUR / 14 x 45 g",
    gewicht: "14 x 45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("ahead", "Protein Bar", "Linzer Cookie"),
    nutrition: {
      energyKj: pair("769 kJ", "1710 kJ"),
      kcal: pair("184 kcal", "408 kcal"),
      protein: pair("12 g", "27 g"),
      fat: pair("10 g", "22 g"),
      saturatedFat: pair("4,4 g", "9,8 g"),
      carbs: pair("15 g", "34 g"),
      sugar: pair("1,6 g", "3,6 g"),
      ballaststoffe: pair("3,5 g", "7,8 g"),
      salz: pair("0,16 g", "0,35 g"),
      polyole: pair("12 g", "26 g"),
    },
  },
  {
    name: "Sportness Proteinriegel 50% - White Chocolate",
    marke: "dm / Sportness",
    imageUrl:
      "https://products.dm-static.com/images/f_auto%2Cq_auto%2Cc_fit%2Ch_440%2Cw_500/v1758007177/assets/pas/images/5919633b-a2ef-4c3e-9697-2e18333739d8/sportness-proteinriegel-50-prozent-crispy-white-chocolate-geschmack",
    summaryPrice: "0,95 EUR",
    detailPrice: "0,95 EUR / 45 g",
    gewicht: "45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("dm / Sportness", "Proteinriegel 50%", "White Chocolate"),
    nutrition: per100Nutrition({
      servingWeightGrams: 45,
      energyKj: 1535,
      kcal: 367,
      protein: 50,
      fat: 11,
      saturatedFat: 6.9,
      carbs: 18,
      sugar: 2.4,
      ballaststoffe: 2.2,
      salz: 0.8,
      polyole: 15,
    }),
  },
  {
    name: "Sportness Proteinriegel 50% - Crispy Stracciatella",
    marke: "dm / Sportness",
    imageUrl:
      "https://products.dm-static.com/images/f_auto%2Cq_auto%2Cc_fit%2Ch_440%2Cw_500/v1748243523/assets/pas/images/f37b6632-e72b-415b-8b61-01c43cb60d95/sportness-proteinriegel-50-prozent-crispy-stracciatella-geschmack",
    summaryPrice: "0,95 EUR",
    detailPrice: "0,95 EUR / 45 g",
    gewicht: "45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("dm / Sportness", "Proteinriegel 50%", "Crispy Stracciatella"),
    nutrition: per100Nutrition({
      servingWeightGrams: 45,
      energyKj: 1519,
      kcal: 362,
      protein: 50,
      fat: 10,
      saturatedFat: 6.3,
      carbs: 18,
      sugar: 2.3,
      ballaststoffe: 2.6,
      salz: 0.8,
      polyole: 15,
    }),
  },
  {
    name: "Sportness Proteinriegel 50% - Orange Dark Chocolate Crisp",
    marke: "dm / Sportness",
    imageUrl:
      "https://products.dm-static.com/images/f_auto%2Cq_auto%2Cc_fit%2Ch_440%2Cw_500/v1756193537/assets/pas/images/121207bb-6175-48df-a97d-4c59a35be426/sportness-proteinriegel-50-prozent-orange-dark-chocolate-crisp-geschmack",
    summaryPrice: "1,45 EUR",
    detailPrice: "1,45 EUR / 60 g",
    gewicht: "60 g",
    servingLabel: "Riegel",
    zutaten:
      officialBarDescription("dm / Sportness", "Proteinriegel 50%", "Orange Dark Chocolate Crisp"),
    nutrition: per100Nutrition({
      servingWeightGrams: 60,
      energyKj: 1557,
      kcal: 376,
      protein: 50,
      fat: 12,
      saturatedFat: 6.2,
      carbs: 20,
      sugar: 3,
      ballaststoffe: 1.4,
      salz: 0.63,
      polyole: 15,
    }),
  },
  {
    name: "Sportness Proteinriegel 60% - Caramel Toffee Crisp",
    marke: "dm / Sportness",
    imageUrl:
      "https://products.dm-static.com/images/f_auto%2Cq_auto%2Cc_fit%2Ch_440%2Cw_500/v1754677430/assets/pas/images/0ac68db7-76d0-4ab0-aaff-cdf4a90bb911/sportness-proteinriegel-60-prozent-caramel-toffee-crisp-geschmack",
    summaryPrice: "0,95 EUR",
    detailPrice: "0,95 EUR / 45 g",
    gewicht: "45 g",
    servingLabel: "Riegel",
    zutaten: officialBarDescription("dm / Sportness", "Proteinriegel 60%", "Caramel Toffee Crisp"),
    nutrition: per100Nutrition({
      servingWeightGrams: 45,
      energyKj: 1438,
      kcal: 343,
      protein: 60,
      fat: 7.5,
      saturatedFat: 4.9,
      carbs: 18,
      sugar: 1.5,
      ballaststoffe: 3.8,
      salz: 0.82,
      polyole: 11,
    }),
  },
  {
    name: "Sportness Proteinriegel 26% - Crunchy Brownie & Cream",
    marke: "dm / Sportness",
    imageUrl:
      "https://products.dm-static.com/images/f_auto%2Cq_auto%2Cc_fit%2Ch_440%2Cw_500/v1759824442/assets/pas/images/bbaf0a47-cb9c-4ec9-a1dd-f55e89b6f852/sportness-proteinriegel-26-prozent-crunchy-brownie-und-cream-geschmack",
    summaryPrice: "0,95 EUR",
    detailPrice: "0,95 EUR / 40 g",
    gewicht: "40 g",
    servingLabel: "Riegel",
    zutaten:
      officialBarDescription("dm / Sportness", "Proteinriegel 26%", "Crunchy Brownie & Cream"),
    nutrition: per100Nutrition({
      servingWeightGrams: 40,
      energyKj: 1743,
      kcal: 418,
      protein: 26,
      fat: 18,
      saturatedFat: 8.1,
      carbs: 31,
      sugar: 3.3,
      ballaststoffe: 12,
      salz: 0.61,
      polyole: 23,
    }),
  },
];

const OFFICIAL_PROTEIN_BAR_VARIANTS: ProteinBarVariant[] = [
  ...ESN_DESIGNER_BAR_VARIANTS,
  ...ESN_GOAT_BAR_VARIANTS,
  ...MORE_PROTEIN_BAR_VARIANTS,
  ...MORE_PROTEIN_SATISBITES_VARIANTS,
  ...MORE_VEGAN_PROTEIN_BAR_VARIANTS,
  ...MORE_WAFER_BAR_VARIANTS,
  ...ADDITIONAL_BRAND_PROTEIN_BAR_VARIANTS,
];

export const OFFICIAL_PROTEINRIEGEL_PRODUCTS =
  OFFICIAL_PROTEIN_BAR_VARIANTS.map(createProductSummary) satisfies ProductSummary[];

export const OFFICIAL_PROTEINRIEGEL_DETAILS = Object.fromEntries(
  OFFICIAL_PROTEIN_BAR_VARIANTS.map((variant) => [variant.name, createProductDetails(variant)])
) satisfies Record<string, ProductDetailsRecord>;
