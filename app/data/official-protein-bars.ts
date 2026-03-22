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

export const OFFICIAL_PROTEINRIEGEL_PRODUCTS = [
  {
    name: "ESN Designer Bar Proteinriegel",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/DesignerBar_45g_Tray_DarkChocolateSaltedAlmondFlavor_2024x2024_shop-4mvbqa9t_ff7823ec-c07e-4039-80a7-f3bf95d0638a.jpg?v=1773753890",
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: "28,90 € / 12 x 45 g",
    kcal: 184,
    protein: 14.5,
    fat: 9,
    carbs: 15,
  },
  {
    name: "ESN GOAT Bar",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0845/1358/7515/files/GOAT_Bar_Tray_12x55g_SaltyPeanutFlavor_2024x2024_shop-pEBRAfJA_e9e3f97e-4a5e-458d-830c-ed20b48b8895.jpg?v=1773753727",
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: "32,90 € / 12 x 55 g",
    kcal: 204,
    protein: 14,
    fat: 6,
    carbs: 20,
  },
  {
    name: "More Protein Bar",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Bar_White_Chocolate_Coconut_50g_4096x4096-gI0kqNul.png?v=1772441088&width=160",
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: "28,99 € / 10 x 50 g",
    kcal: 182,
    protein: 16,
    fat: 7.5,
    carbs: 15,
  },
  {
    name: "More Protein Satisbites",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Satisbites_White_Chocolate_Blueberry_Cheesecake_4096x4096-xFW66rF6.png?v=1752745805&width=160",
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: "34,49 € / 12 x 2 x 25 g",
    kcal: 184,
    protein: 15,
    fat: 8.2,
    carbs: 17,
  },
  {
    name: "More Vegan Protein Bar",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Bar_Vegan_Peanut_Butter_Tray_4096x4096-n6SUBGQq_52d720da-07d2-46dc-8b3f-f2ee0ff64bbd.png?v=1760426649",
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: "28,99 € / 10 x 55 g",
    kcal: 199,
    protein: 16,
    fat: 9.2,
    carbs: 18,
  },
  {
    name: "More Protein Wafer Bar",
    imageUrl:
      "https://cdn.shopify.com/s/files/1/0503/7536/0676/files/Protein_Wafer_Bar_Milk_Chocolate_Hazelnut_Tray_4096x4096-0biR3Aqk_9d2b825e-ea88-4e73-8acb-ebd0819f36b5.png?v=1767606848",
    category: "Proteinriegel",
    slug: "proteinriegel",
    price: "16,99 € / 6 x 30 g",
    kcal: 148,
    protein: 8.1,
    fat: 9.3,
    carbs: 7.8,
  },
] satisfies ProductSummary[];

export const OFFICIAL_PROTEINRIEGEL_DETAILS = {
  "ESN Designer Bar Proteinriegel": {
    marke: "ESN",
    gewicht: "12 x 45 g",
    preis: "28,90 €",
    kategorie: "Proteinriegel",
    zutaten:
      "Die offizielle ESN-Produktseite beschreibt einen Proteinriegel mit Milchprotein, Schokolade, cremigem Kern und knusprigem Topping. Die genaue Zutatenliste variiert je nach Sorte. Verfuegbare Box-Sorten: Peanut Butter Pretzel, Strawberry White Chocolate, White Chocolate Pistachio, Strawberry Yogurt, Dark Cookie White Choc, Fudge Brownie, Almond Coconut, Cinnamon Cereal und Peanut Caramel.",
    naehrwerte: {
      kcal: "178-191 kcal / Riegel (je nach Sorte)",
      protein: "14-15 g / Riegel",
      fat: "8,2-10 g / Riegel",
      carbs: "13-16 g / Riegel",
      sugar: "0,3-2 g / Riegel (je nach Sorte)",
      ballaststoffe: "1,2-4,6 g / Riegel (je nach Sorte)",
    },
    aminosaeurenprofil: [],
    quelle: "online",
  },
  "ESN GOAT Bar": {
    marke: "ESN",
    gewicht: "12 x 55 g",
    preis: "32,90 €",
    kategorie: "Proteinriegel",
    zutaten:
      "Aktuell gelistete Sorte: Salty Peanut. Laut offizieller ESN-Beschreibung u. a. mit Haferflocken (20 %), geroesteten Erdnussen (19 %), Eiklarpulver (17 %), Dattelpaste (11 %), dunklen Schokoladenstueckchen (7 %), Oligofruktose, Invertzuckersirup, Honig (6 %), Sojakrispies, Kokosnussfett, Meersalz und Aroma. Verfuegbare Box-Sorten: Salty Peanut und Berries.",
    naehrwerte: {
      kcal: "ca. 204 kcal / Riegel",
      protein: "14 g / Riegel",
      fat: "ca. 6 g / Riegel",
      carbs: "ca. 20 g / Riegel",
      sugar: "ca. 12 g / Riegel",
      ballaststoffe: "ca. 5,4 g / Riegel",
    },
    aminosaeurenprofil: [],
    quelle: "online",
  },
  "More Protein Bar": {
    marke: "More Nutrition",
    gewicht: "10 x 50 g",
    preis: "28,99 €",
    kategorie: "Proteinriegel",
    zutaten:
      "Aktuell gelistete Variante: White Chocolate Coconut. Offizielle Zutatenangabe auszugsweise: 33 % Milcheiweiss, Suessungsmittel, weisse Schokolade (15 %), Fuellung mit Sonnenblumenoel und Magermilchpulver, Kollagenhydrolysat, Feuchthaltemittel, Palmfett, Ballaststoffe, Aroma und Emulgator. Verfuegbare Box-Sorten: White Chocolate Coconut, Caramel Morezipan, White Chocolate Caramel Crunch, Milky Hazelnut Chocolate Cream, Caramel Crunch, White Chocolate Peanut Caramel, Peanut Caramel und Milky Candy Cream.",
    naehrwerte: {
      energyKj: "1531 kJ / 100 g",
      kcal: "182 kcal / Riegel, 363 kcal / 100 g",
      protein: "16 g / Riegel, 33 g / 100 g",
      fat: "7,5 g / Riegel, 15 g / 100 g",
      saturatedFat: "4,8 g / 100 g",
      carbs: "15 g / Riegel, 29 g / 100 g",
      sugar: "2,2 g / Riegel, 4,4 g / 100 g",
      ballaststoffe: "4,7 g / Riegel, 9,4 g / 100 g",
      salz: "0,19 g / Riegel, 0,39 g / 100 g",
      polyole: "11 g / Riegel, 22 g / 100 g",
    },
    aminosaeurenprofil: [],
    quelle: "online",
  },
  "More Protein Satisbites": {
    marke: "More Nutrition",
    gewicht: "12 x 2 x 25 g",
    preis: "34,49 €",
    kategorie: "Proteinriegel",
    zutaten:
      "Aktuell gelistete Variante: White Chocolate Blueberry Cheesecake. Offizielle Produktseite bewirbt zwei Bites pro Portion, Protein, Glucomannan und keinen zugesetzten Zucker. Verfuegbare Box-Sorten: White Chocolate Blueberry Cheesecake, Dark Chocolate Caramel Brownie, Milk Chocolate Coconut, Dark Cookie Crumble, Milk Chocolate Pistachio und White Chocolate Strawberry Cream.",
    naehrwerte: {
      kcal: "184 kcal / Portion",
      protein: "15 g / Portion",
      fat: "8,2 g / Portion",
      carbs: "17 g / Portion",
      glucomannan: "1,5 g / Portion",
    },
    aminosaeurenprofil: [],
    quelle: "online",
  },
  "More Vegan Protein Bar": {
    marke: "More Nutrition",
    gewicht: "10 x 55 g",
    preis: "28,99 €",
    kategorie: "Proteinriegel",
    zutaten:
      "Aktuell gelistete Variante: Peanut Butter. Offizielle Produktseite beschreibt einen veganen Proteinriegel ohne tierische Zutaten und ohne zugesetzten Zucker. Verfuegbare Box-Sorten: Peanut Butter, Spekulatius, Hazelnut Nougat und Morezipan Almond Cake.",
    naehrwerte: {
      kcal: "199 kcal / Riegel",
      protein: "16 g / Riegel",
      fat: "9,2 g / Riegel",
      carbs: "18 g / Riegel",
    },
    aminosaeurenprofil: [],
    quelle: "online",
  },
  "More Protein Wafer Bar": {
    marke: "More Nutrition",
    gewicht: "6 x 30 g",
    preis: "16,99 €",
    kategorie: "Proteinriegel",
    zutaten:
      "Aktuell gelistete Variante: Milk Chocolate Hazelnut. Offizielle Produktseite beschreibt einen knusprigen Wafer-Riegel mit Schokolade, Haselnussnote, Protein und ohne zugesetzten Zucker.",
    naehrwerte: {
      kcal: "148 kcal / Riegel",
      protein: "8,1 g / Riegel",
      fat: "9,3 g / Riegel",
      carbs: "7,8 g / Riegel",
      sugar: "1,6 g / Riegel",
    },
    aminosaeurenprofil: [],
    quelle: "online",
  },
} satisfies Record<string, ProductDetailsRecord>;
