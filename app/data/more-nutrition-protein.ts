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
    koffein?: number | string;
    glucomannan?: number | string;
  };
  aminosaeurenprofil?: AminoAcidEntry[];
  quelle: "online" | "placeholder";
};

export const MORE_NUTRITION_PROTEINPULVER_PRODUCTS = [
  {
    name: "More Nutrition More Protein Iced Coffee",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Iced_Coffee_Latte_Macchiato_500g_1500x.png?v=1768122392",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "31,99 €",
    kcal: 383,
    protein: 61,
    fat: 8.3,
    carbs: 12,
  },
  {
    name: "More Nutrition More Protein Iced Matcha Latte",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Iced_Matcha_Latte_Mango_Dream_500g_1600x.png?v=1768122394&width=160",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "32,99 €",
    kcal: 375,
    protein: 66,
    fat: 5.1,
    carbs: 13,
  },
  {
    name: "More Nutrition More Protein Sahne",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Sahne_600g_2048x.png?v=1769575850",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "32,99 €",
    kcal: 397,
    protein: 77,
    fat: 6.9,
    carbs: 6,
  },
  {
    name: "More Nutrition More Protein",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Neutral_600g_2048x.png?v=1768122390&width=160",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "32,99 €",
    kcal: 375,
    protein: 78,
    fat: 3.6,
    carbs: 8,
  },
  {
    name: "More Nutrition More Clear Protein",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Clear_Protein_600g_Juice_Style_Pear_Cinnamon_2048x.png?v=1768122385",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "36,99 €",
    kcal: 350,
    protein: 81,
    fat: 0,
    carbs: 3.8,
  },
  {
    name: "More Nutrition More Vegan Protein",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Vegan_Protein_600g_Neutral_2048x.png?v=1768122399&width=160",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "32,99 €",
    kcal: 351,
    protein: 75,
    fat: 1.9,
    carbs: 8.1,
  },
  {
    name: "More Nutrition More Protein Milkyccino",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Milkyccino_500g_Mango_Coconut_2048x.png?v=1768122395&width=160",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "29,99 €",
    kcal: 382,
    protein: 64,
    fat: 6.9,
    carbs: 12,
  },
  {
    name: "More Nutrition More Protein Iced Chai Latte",
    imageUrl:
      "https://morenutrition.de/cdn/shop/files/More_Protein_Iced_Chai_Latte_Maple_Walnut_500g_2048x.png?v=1768122389&width=160",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "32,99 €",
    kcal: 386,
    protein: 64,
    fat: 7.2,
    carbs: 14,
  },
] satisfies ProductSummary[];

export const MORE_NUTRITION_PROTEIN_DETAILS = {
  "More Nutrition More Protein Iced Coffee": {
    marke: "More Nutrition",
    gewicht: "500 g",
    preis: "31,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Molkenproteinkonzentrat 49 %, Calciumcaseinat 19 %, stark entoeltes Kakaopulver 16 %, weisse Schokoladen-Crisps 4,5 %, Instant-Kaffee 4 %, Sahnepulver, Aroma, Emulgatoren, Laktase, Verdickungsmittel, Suessungsmittel und Koffein.",
    naehrwerte: {
      energyKj: "1613 kJ / 100 g",
      kcal: "383 kcal / 100 g",
      protein: "61 g / 100 g",
      fat: "8,3 g / 100 g",
      saturatedFat: "4,7 g / 100 g",
      carbs: "12 g / 100 g",
      sugar: "6,4 g / 100 g",
      ballaststoffe: "6,2 g / 100 g",
      salz: "0,67 g / 100 g",
      koffein: "294 mg / 100 g",
    },
    quelle: "online",
  },
  "More Nutrition More Protein Iced Matcha Latte": {
    marke: "More Nutrition",
    gewicht: "500 g",
    preis: "32,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Molkenproteinkonzentrat 57 %, Calciumcaseinat 20 %, Matcha-Gruenteepulver 8 %, Glucomannan (aus Konjakwurzel), Sahnepulver, Aroma, Mangofruchtstueckchen 2 %, Emulgatoren, Laktase, Verdickungsmittel und Suessungsmittel.",
    naehrwerte: {
      energyKj: "1585 kJ / 100 g",
      kcal: "375 kcal / 100 g",
      protein: "66 g / 100 g",
      fat: "5,1 g / 100 g",
      saturatedFat: "2,9 g / 100 g",
      carbs: "13 g / 100 g",
      sugar: "6,0 g / 100 g",
      ballaststoffe: "7,4 g / 100 g",
      salz: "0,54 g / 100 g",
      koffein: "85 mg pro Portion",
      glucomannan: "4000 mg / 100 g",
    },
    quelle: "online",
  },
  "More Nutrition More Protein Sahne": {
    marke: "More Nutrition",
    gewicht: "600 g",
    preis: "32,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Milcheiweiss 90 % (Molkenproteinkonzentrat, Calciumcaseinat), Sahnepulver 8 %, Emulgator (Lecithine) und Laktase.",
    naehrwerte: {
      energyKj: "1673 kJ / 100 g",
      kcal: "397 kcal / 100 g",
      protein: "77 g / 100 g",
      fat: "6,9 g / 100 g",
      saturatedFat: "4,3 g / 100 g",
      carbs: "6,0 g / 100 g",
      sugar: "5,9 g / 100 g",
      ballaststoffe: "0 g / 100 g",
      salz: "0,51 g / 100 g",
    },
    aminosaeurenprofil: [
      { name: "Leucin", amount: "9,3 g" },
      { name: "Lysin", amount: "8,3 g" },
      { name: "Threonin", amount: "5,3 g" },
      { name: "Valin", amount: "5,8 g" },
      { name: "Isoleucin", amount: "5,3 g" },
      { name: "Phenylalanin", amount: "3,8 g" },
      { name: "Methionin", amount: "2,3 g" },
      { name: "Tryptophan", amount: "1,1 g" },
      { name: "Histidin", amount: "2,1 g" },
      { name: "Prolin", amount: "7,5 g" },
      { name: "Tyrosin", amount: "3,9 g" },
      { name: "Arginin", amount: "2,8 g" },
      { name: "Glycin", amount: "1,7 g" },
      { name: "Cystein", amount: "1,3 g" },
      { name: "Glutaminsaeure", amount: "19 g" },
      { name: "Asparaginsaeure", amount: "8,8 g" },
      { name: "Serin", amount: "5,0 g" },
      { name: "Alanin", amount: "3,9 g" },
    ],
    quelle: "online",
  },
  "More Nutrition More Protein": {
    marke: "More Nutrition",
    gewicht: "600 g",
    preis: "32,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Milcheiweiss 92 % (Molkenproteinkonzentrat, Calciumcaseinat), Aroma, Emulgator (Lecithine), Salz, faerbendes Lebensmittel (Rote Beete Pulver), Laktase und Suessungsmittel.",
    naehrwerte: {
      energyKj: "1580 kJ / 100 g",
      kcal: "375 kcal / 100 g",
      protein: "78 g / 100 g",
      fat: "3,6 g / 100 g",
      saturatedFat: "2,0 g / 100 g",
      carbs: "8,0 g / 100 g",
      sugar: "3,7 g / 100 g",
      ballaststoffe: "0 g / 100 g",
      salz: "1,5 g / 100 g",
    },
    aminosaeurenprofil: [
      { name: "Leucin", amount: "9,3 g" },
      { name: "Lysin", amount: "8,3 g" },
      { name: "Threonin", amount: "5,3 g" },
      { name: "Valin", amount: "5,8 g" },
      { name: "Isoleucin", amount: "5,3 g" },
      { name: "Phenylalanin", amount: "3,8 g" },
      { name: "Methionin", amount: "2,3 g" },
      { name: "Tryptophan", amount: "1,1 g" },
      { name: "Histidin", amount: "2,1 g" },
      { name: "Prolin", amount: "7,4 g" },
      { name: "Tyrosin", amount: "3,8 g" },
      { name: "Arginin", amount: "2,8 g" },
      { name: "Glycin", amount: "1,7 g" },
      { name: "Cystein", amount: "1,4 g" },
      { name: "Glutaminsaeure", amount: "19 g" },
      { name: "Asparaginsaeure", amount: "8,8 g" },
      { name: "Serin", amount: "5,0 g" },
      { name: "Alanin", amount: "3,9 g" },
    ],
    quelle: "online",
  },
  "More Nutrition More Clear Protein": {
    marke: "More Nutrition",
    gewicht: "600 g",
    preis: "36,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Molkenproteinisolat 95 %, Aroma, Suessungsmittel (Sucralose, glycosylierte Steviolglycoside), Ceylon-Zimtpulver 0,2 % und Farbstoffe.",
    naehrwerte: {
      energyKj: "1484 kJ / 100 g",
      kcal: "350 kcal / 100 g",
      protein: "81 g / 100 g",
      fat: "0 g / 100 g",
      saturatedFat: "0 g / 100 g",
      carbs: "3,8 g / 100 g",
      sugar: "1,1 g / 100 g",
      ballaststoffe: "0 g / 100 g",
      salz: "0,10 g / 100 g",
    },
    aminosaeurenprofil: [
      { name: "Leucin", amount: "12 g" },
      { name: "Lysin", amount: "11 g" },
      { name: "Threonin", amount: "7,9 g" },
      { name: "Valin", amount: "6,4 g" },
      { name: "Isoleucin", amount: "7,2 g" },
      { name: "Phenylalanin", amount: "3,2 g" },
      { name: "Methionin", amount: "2,4 g" },
      { name: "Tryptophan", amount: "1,9 g" },
      { name: "Histidin", amount: "1,7 g" },
      { name: "Prolin", amount: "6,9 g" },
      { name: "Tyrosin", amount: "3,0 g" },
      { name: "Arginin", amount: "2,2 g" },
      { name: "Glycin", amount: "1,6 g" },
      { name: "Cystein", amount: "1,9 g" },
      { name: "Glutaminsaeure", amount: "20 g" },
      { name: "Asparaginsaeure", amount: "12 g" },
      { name: "Serin", amount: "5,1 g" },
      { name: "Alanin", amount: "5,9 g" },
    ],
    quelle: "online",
  },
  "More Nutrition More Vegan Protein": {
    marke: "More Nutrition",
    gewicht: "600 g",
    preis: "32,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Sojaprotein 81 %, Mandelprotein 6 %, Cerealienstueckchen 5 %, Ackerbohnenprotein 4 %, Aroma, Salz und Suessungsmittel.",
    naehrwerte: {
      energyKj: "1473 kJ / 100 g",
      kcal: "351 kcal / 100 g",
      protein: "75 g / 100 g",
      fat: "1,9 g / 100 g",
      saturatedFat: "0,6 g / 100 g",
      carbs: "8,1 g / 100 g",
      sugar: "2,4 g / 100 g",
      ballaststoffe: "1,3 g / 100 g",
      salz: "0,66 g / 100 g",
    },
    aminosaeurenprofil: [
      { name: "Leucin", amount: "8,0 g" },
      { name: "Lysin", amount: "6,0 g" },
      { name: "Threonin", amount: "3,6 g" },
      { name: "Valin", amount: "4,0 g" },
      { name: "Isoleucin", amount: "4,1 g" },
      { name: "Phenylalanin", amount: "5,0 g" },
      { name: "Methionin", amount: "1,2 g" },
      { name: "Tryptophan", amount: "1,5 g" },
      { name: "Histidin", amount: "3,1 g" },
      { name: "Prolin", amount: "5,2 g" },
      { name: "Tyrosin", amount: "3,6 g" },
      { name: "Arginin", amount: "7,7 g" },
      { name: "Glycin", amount: "4,2 g" },
      { name: "Cystein", amount: "1,7 g" },
      { name: "Glutaminsaeure", amount: "21 g" },
      { name: "Asparaginsaeure", amount: "11 g" },
      { name: "Serin", amount: "4,4 g" },
      { name: "Alanin", amount: "3,9 g" },
    ],
    quelle: "online",
  },
  "More Nutrition More Protein Milkyccino": {
    marke: "More Nutrition",
    gewicht: "500 g",
    preis: "29,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Molkenproteinkonzentrat 57 %, Calciumcaseinat 20 %, Glucomannan (aus der Konjakwurzel), Magermilchpulver, Sahnepulver, Aroma, Kokosraspeln 3 %, Emulgator, Farbstoffe, Verdickungsmittel, Koffein, Laktase, Saeuerungsmittel und Suessungsmittel.",
    naehrwerte: {
      energyKj: "1609 kJ / 100 g",
      kcal: "382 kcal / 100 g",
      protein: "64 g / 100 g",
      fat: "6,9 g / 100 g",
      saturatedFat: "5,3 g / 100 g",
      carbs: "12 g / 100 g",
      sugar: "6,5 g / 100 g",
      ballaststoffe: "4,7 g / 100 g",
      salz: "0,55 g / 100 g",
      koffein: "321 mg / 100 g",
      glucomannan: "4000 mg / 100 g",
    },
    quelle: "online",
  },
  "More Nutrition More Protein Iced Chai Latte": {
    marke: "More Nutrition",
    gewicht: "500 g",
    preis: "32,99 €",
    kategorie: "Proteinpulver",
    zutaten:
      "Molkenproteinkonzentrat 58 %, Calciumcaseinat 18 %, Sahnepulver, Aroma, Glucomannan (aus Konjakwurzel), Emulgator, Farbstoff, Ceylon-Zimtpulver 0,7 %, Schwarztee-Extrakt 0,6 %, Koffein, Laktase und Suessungsmittel.",
    naehrwerte: {
      energyKj: "1625 kJ / 100 g",
      kcal: "386 kcal / 100 g",
      protein: "64 g / 100 g",
      fat: "7,2 g / 100 g",
      saturatedFat: "4,4 g / 100 g",
      carbs: "14 g / 100 g",
      sugar: "7,7 g / 100 g",
      ballaststoffe: "4,6 g / 100 g",
      salz: "0,30 g / 100 g",
      koffein: "313 mg / 100 g",
      glucomannan: "4000 mg / 100 g",
    },
    quelle: "online",
  },
} satisfies Record<string, ProductDetailsRecord>;
