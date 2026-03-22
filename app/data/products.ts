import { MORE_NUTRITION_PROTEINPULVER_PRODUCTS } from "./more-nutrition-protein";

export interface Product {
  name: string;
  imageUrl: string;
  category: string;
  slug: string;
  price?: string;
  kcal?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
}
function slugifyProductSegment(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "produkt";
}

export function getProductRouteSlug(
  product: Pick<Product, "name" | "category">
): string {
  return slugifyProductSegment(`${product.category}-${product.name}`);
}

export const DEFAULT_PRODUCT_IMAGE = "/images/placeholders/product-default.svg";

export function getProductImageUrl(product: {
  imageUrl?: string | null;
}): string {
  const imageUrl = product.imageUrl?.trim();
  return imageUrl || DEFAULT_PRODUCT_IMAGE;
}

export function getProductPriceValue(product: {
  price?: string | null;
}): number | null {
  const rawPrice = product.price?.trim();
  if (!rawPrice) {
    return null;
  }

  const normalizedPrice = rawPrice
    .replace(/â‚¬/g, "€")
    .replace(/\s+/g, "")
    .replace(/€/g, "")
    .replace(/,/g, ".");

  const numericMatches = normalizedPrice.match(/\d+(?:\.\d+)?/g);
  if (!numericMatches || numericMatches.length === 0) {
    return null;
  }

  const numericValues = numericMatches
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return null;
  }

  return Math.min(...numericValues);
}

export const PIZZA_PRODUCTS: Product[] = [
  // --- Dr. Oetker Ristorante ---
  {
    name: "Dr. Oetker Ristorante Mozzarella",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/481/9806/front_en.247.full.jpg",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 238,
    protein: 10,
    fat: 11,
    carbs: 23,
  },
  {
    name: "Dr. Oetker Ristorante Margherita",
    imageUrl: "https://dutchshopper.com/cdn/shop/files/648185_19ef9a29-b65a-45c1-aefe-3c5e3773bc9b.png?crop=center&height=500&v=1736659229&width=600",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 220,
    protein: 9,
    fat: 9,
    carbs: 26,
  },
  {
    name: "Dr. Oetker Ristorante Funghi",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/481/9103/front_en.94.full.jpg",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 210,
    protein: 9,
    fat: 8,
    carbs: 26,
  },
  {
    name: "Dr. Oetker Ristorante Salame",
    imageUrl: "https://www.geestsprudel.de/cdn/shop/files/dr-oetker-pizza-ristorante-salami-packung-320g_1613039144_86d6a54d-e4fb-4c9c-bc63-db0bce6a25b6.jpg?v=1713209794",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 250,
    protein: 11,
    fat: 12,
    carbs: 24,
  },
  {
    name: "Dr. Oetker Ristorante Speciale",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfp47tfun206w7o0mjr3w7",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 260,
    protein: 11,
    fat: 13,
    carbs: 23,
  },
  {
    name: "Dr. Oetker Ristorante Pollo",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/482/0000/front_fr.104.full.jpg",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 240,
    protein: 12,
    fat: 9,
    carbs: 26,
  },
  {
    name: "Dr. Oetker Ristorante Quattro Formaggi",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/481/8908/front_de.203.full.jpg",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 270,
    protein: 11,
    fat: 15,
    carbs: 23,
  },
  {
    name: "Dr. Oetker Ristorante Prosciutto",
    imageUrl: "https://img.rewe-static.de/7828363/34878401_digital-image.png?imwidth=840&impolicy=pdp",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 230,
    protein: 11,
    fat: 10,
    carbs: 25,
  },
  {
    name: "Dr. Oetker Ristorante Hawaii",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfpo1bfl5x06vxdc6cg33g",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 235,
    protein: 10,
    fat: 9,
    carbs: 27,
  },
  {
    name: "Dr. Oetker Ristorante Spinaci",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmijfsaueg3fq07uoup5pavlq?opt",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 210,
    protein: 9,
    fat: 8,
    carbs: 26,
  },
  {
    name: "Dr. Oetker Ristorante Margherita Pomodori",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmijfdjg8ewlt06un9pueh24u?opt",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 220,
    protein: 9,
    fat: 9,
    carbs: 26,
  },
  {
    name: "Dr. Oetker Ristorante Tonno",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfef6nexc608w667ffjym7",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 235,
    protein: 12,
    fat: 9,
    carbs: 24,
  },
  {
    name: "Dr. Oetker Ristorante Pepperoni Salame",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality:value:75/output:format:webp/resize:fit:clip,height:662,width:662/cmhtqj2dgc0mp07w8jb17nlsx?opt",
    category: "Pizza",
    slug: "pizza",
    price: "3,49 €",
    kcal: 260,
    protein: 11,
    fat: 13,
    carbs: 24,
  },

  // --- Dr. Oetker Tradizionale ---
  {
    name: "Dr. Oetker Tradizionale Speciale",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality:value:75/output:format:webp/resize:fit:clip,height:662,width:662/cmijfietaf9ru06untu16bqwn?opt",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 228,
    protein: 9.7,
    fat: 7.9,
    carbs: 28,
  },
  {
    name: "Dr. Oetker Tradizionale Salame",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijhlmtykl3407uieomj1qbj",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 256,
    protein: 10.3,
    fat: 9,
    carbs: 32.2,
  },
  {
    name: "Dr. Oetker Tradizionale Mozzarella E Pesto",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfiypif7ca07ui9cscqgir",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 239,
    protein: 8.6,
    fat: 9.1,
    carbs: 30,
  },
  {
    name: "Dr. Oetker Tradizionale Tonno",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmhtpx1om8qnd07w04ibpm5ni",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 216,
    protein: 10.5,
    fat: 6.6,
    carbs: 27.5,
  },
  {
    name: "Dr. Oetker Tradizionale Margherita",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality:value:75/output:format:webp/resize:fit:clip,height:662,width:662/cmhtpw8c28tv607uul1eq1gff?opt",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 239,
    protein: 10,
    fat: 8,
    carbs: 31,
  },
  {
    name: "Dr. Oetker Tradizionale Quattro Formaggi",
    imageUrl: "https://img.rewe-static.de/8705058/35088968_digital-image.png?imwidth=840&impolicy=pdp",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 260,
    protein: 11,
    fat: 13,
    carbs: 24,
  },
  {
    name: "Dr. Oetker Tradizionale Spinaci E Ricotta",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfw6jig4v207uizhtrctke",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 226,
    protein: 7.5,
    fat: 8,
    carbs: 29,
  },
  {
    name: "Dr. Oetker Tradizionale Diavola Calabrese",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality:value:75/output:format:webp/resize:fit:clip,height:662,width:662/cmhtql52lcipu07uvicx99sca?opt",
    category: "Pizza",
    slug: "pizza",
    price: "3,49-4,19 €",
    kcal: 234,
    protein: 9.3,
    fat: 7,
    carbs: 32,
  },

  // --- Dr. Oetker Casa di Mama ---
  {
    name: "Dr. Oetker Casa di Mama Speciale",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfbdp0esm407uo19c62azr",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Dr. Oetker Casa di Mama Salame",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmdemawtldtqg08uli16ywv4h",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Dr. Oetker Casa di Mama Quattro Formaggi",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfx0llgenn07uox4d7suth",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Dr. Oetker Casa di Mama Tonno",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmi811mpoc3cq07vwtcf2ed1w",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Dr. Oetker Casa di Mama Margherita",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmi9eokcf95cd07w1out6mml2",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Dr. Oetker Casa di Mama Hawaii",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmidp84lanv6x07uolikw6ze8",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Dr. Oetker Casa di Mama Diavola",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmi802k6783cy07vw64t130zn",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Dr. Oetker SUPREMA ---
  {
    name: "Dr. Oetker SUPREMA Salami",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmden7bpgg4x408vuei6mx6xq",
    category: "Pizza",
    slug: "pizza",
    price: "3,99-5,49 €",
    kcal: 234,
    protein: 10,
    fat: 8.9,
    carbs: 28,
  },
  {
    name: "Dr. Oetker SUPREMA Calabrese & Nduja",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmden7721g64407w0f4cna2j5",
    category: "Pizza",
    slug: "pizza",
    price: "4,49-5,49 €",
    kcal: 231,
    protein: 9.2,
    fat: 9.1,
    carbs: 27,
  },
  {
    name: "Dr. Oetker SUPREMA Margherita",
    imageUrl: "https://img.rewe-static.de/9977185/44315103_digital-image.png",
    category: "Pizza",
    slug: "pizza",
    price: "4,49-5,49 €",
    kcal: 233,
    protein: 10,
    fat: 8.5,
    carbs: 28,
  },

  // --- Wagner Steinofen ---
  {
    name: "Wagner Steinofen Margherita",
    imageUrl: "https://www.original-wagner.de/sites/default/files/2025-01/STO_Margherita_15Grad.png",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 242,
    protein: 10.9,
    fat: 8.9,
    carbs: 28.7,
  },
  {
    name: "Wagner Steinofen Salami",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx9WBB5tpbElXRoLYFZWUh2eFv66Db4cUmsQ&s",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 252,
    protein: 10.9,
    fat: 10.4,
    carbs: 27.6,
  },
  {
    name: "Wagner Steinofen Speciale",
    imageUrl: "https://www.original-wagner.de/sites/default/files/2025-01/STO_Speciale_15Grad.png",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 232,
    protein: 10.4,
    fat: 11.1,
    carbs: 21.8,
  },
  {
    name: "Wagner Steinofen Peperoni-Salami",
    imageUrl: "https://www.original-wagner.de/sites/default/files/2025-01/STO_Peperoni_15Grad.png",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 250,
    protein: 11,
    fat: 10.5,
    carbs: 27,
  },
  {
    name: "Wagner Steinofen Hawaii",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFDoew29FRy3F5FnHZbDrtyrR-wO5EwrfPAA&s",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 220,
    protein: 9.5,
    fat: 8.5,
    carbs: 28,
  },
  {
    name: "Wagner Steinofen Tonno",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgwUnNEiCF48Imp5pBICpNSjHfdNatctDCFA&s",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 220,
    protein: 11,
    fat: 7.5,
    carbs: 26,
  },
  {
    name: "Wagner Steinofen Spinat",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQU1Q3LImrHDfuMuEo4NYUHDDRfMzUwZGrzA&s",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 210,
    protein: 9,
    fat: 8,
    carbs: 26,
  },
  {
    name: "Wagner Steinofen Piccolinis Salami",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG2KAImEW977rpj2ftJPFtBb-2C7Fn3tBowQ&s",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 251,
    protein: 10,
    fat: 11,
    carbs: 26,
  },
  {
    name: "Wagner Steinofen Piccolinis Speciale",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOOTem-6AOznhoPgQTZYGCWWzZaBAzg2SvAg&s",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 226,
    protein: 9.5,
    fat: 9,
    carbs: 26,
  },
  {
    name: "Wagner Steinofen Piccolinis Elsässer Art",
    imageUrl: "https://img.hit.de/sortiment/4009/2330/1404/4009233014040_43064635_720px.webp",
    category: "Pizza",
    slug: "pizza",
    price: "2,99-3,79 €",
    kcal: 238,
    protein: 7,
    fat: 10,
    carbs: 28,
  },

  // --- Gustavo Gusto ---
  {
    name: "Gustavo Gusto Margherita",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/07/GUSTAVO-GUSTO-MARGHERITA-PIZZA-1.jpeg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto Salame",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/SALAMI-700x700.jpeg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto Prosciutto E Funghi",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/PROSCIUTTOFUNGHI.jpeg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto Tonno",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2021/02/tiefkuehlpizza-thunfisch-gustavo-700x700.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto Salame Piccante",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/PICCANTE.jpeg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto Spinaci",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/SPINACI-700x700.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto Hawaii",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/ANANAS-700x700.jpeg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Gustavo Gusto New York Style",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2025/02/New-York-Style-Pizza-Karton-Gustavo-Gusto-700x700.jpg",
    category: "Pizza",
    slug: "pizza",
    price: "4,69 € - 5,69 €",
    kcal: 1086,
    protein: 49,
    fat: 46,
    carbs: 117,
  },

  // --- Lidl Trattoria Alfredo ---
  {
    name: "Lidl Trattoria Alfredo Salami",
    imageUrl: "https://cdn.test.de/file/image/ct/produktbilder/330000032390/v1/14/hauptbild_original/hauptbild_original.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Lidl Trattoria Alfredo Margherita",
    imageUrl: "https://images.openfoodfacts.org/images/products/405/648/944/3025/front_de.26.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Lidl Trattoria Alfredo Speciale",
    imageUrl: "https://images.openfoodfacts.org/images/products/405/648/945/2454/front_en.4.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Lidl Trattoria Alfredo Spinaci",
    imageUrl: "https://images.openfoodfacts.org/images/products/405/648/944/2967/front_de.9.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Lidl Trattoria Alfredo Tonno",
    imageUrl: "https://www.mustakshif.com/public/uploads/products/stonebaked-pizza-tonno_4056489691952_Mustakshif.jpg",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Aldi Casa Romana / GutBio / Gastro ---
  {
    name: "Aldi Casa Romana Salami",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/produkte/tiefgekuehltes/6840_44-2021_TKSTEINOFENPIZZASALAMI3X350G-01_ON.png/_jcr_content/renditions/opt.1250w.png.res/1631601306424/opt.1250w.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Aldi Casa Romana Margherita",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/produkte/vollsortiment/6712_44-2021_TKSTEINOFENPIZZAMARGHERITA-01_ON.png/_jcr_content/renditions/opt.1250w.png.res/1706168268425/opt.1250w.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Aldi Casa Romana Speciale",
    imageUrl: "https://s7g10.scene7.com/is/image/aldi/202505300073",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Aldi Casa Romana Tonno",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/angebote/2020/kw46/produkte/6880_47-2020_Pizz-Ah_PizzaTonno_ON.png/_jcr_content/renditions/opt.1250w.png.res/1604486364395/opt.1250w.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Aldi Gigante Salami",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/angebote/2022/kw39/hero/1017255_39-2022_GustoGigante-Rindersalami_ON1.png/_jcr_content/renditions/opt.1250w.png.res/1662731586956/opt.1250w.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Aldi Gigante Mozzarella",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/angebote/2022/kw39/hero/1017255_39-2022_GustoGigante-Mozzarella_ON1.png/_jcr_content/renditions/opt.1250w.png.res/1662731562524/opt.1250w.png",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Penny San Fabio ---
  {
    name: "Penny San Fabio Margherita",
    imageUrl: "https://images.openfoodfacts.org/images/products/433/725/681/8254/front_de.9.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Penny San Fabio Salami",
    imageUrl: "https://images.openfoodfacts.org/images/products/433/725/682/2305/front_de.7.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Penny San Fabio Spinaci",
    imageUrl: "https://image.jimcdn.com/app/cms/image/transf/none/path/sf03b1c85b4db8d52/image/ie0d0f70215bb024c/version/1516225192/image.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Penny San Fabio Tonno",
    imageUrl: "https://image.jimcdn.com/app/cms/image/transf/none/path/sf03b1c85b4db8d52/image/i4e0fb2d8df04eb23/version/1516225660/image.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Penny San Fabio Prosciutto",
    imageUrl: "https://hazhozabc.hu/sites/default/files/styles/large/public/tartalomkepek/pizza_sonkas.png?itok=TfvfDy2I",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Rewe Beste Wahl ---
  {
    name: "Rewe Beste Wahl Salami",
    imageUrl: "https://img.rewe-static.de/7616343/43860356_digital-image.png?imwidth=840&impolicy=pdp",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Rewe Beste Wahl Margherita",
    imageUrl: "https://img.rewe-static.de/7618551/43204024_digital-image.png?imwidth=840&impolicy=pdp",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Rewe Beste Wahl ZiegenkÃ¤se",
    imageUrl: "https://img.rewe-static.de/8196324/28584137_digital-image.png?imwidth=840&impolicy=pdp",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Edeka GUT & GÃœNSTIG ---
  {
    name: "Edeka G&G Salami",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v2/DV019_4311501658185_PER.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Edeka G&G Margherita",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v3/DV019_4311501674345_PER.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Edeka G&G Speciale",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v2/DV019_4311501677292_PER.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Edeka G&G Hawaii",
    imageUrl: "https://lebensmittel-versand.eu/media/image/product/59691/md/gg-steinpizza-hawaii-2x355g.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Edeka G&G Double Salami",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v3/DV019_4311501665589_PER.png",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Edeka G&G Tonno",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v2/DV019_4311501676653_PER.png",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Kaufland K-Classic ---
  {
    name: "K-Classic Pizza Salami",
    imageUrl: "https://cdn.test.de/file/image/ct/produktbilder/330000032390/v1/13/hauptbild_original/hauptbild_original.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "K-Classic Pizza Margherita",
    imageUrl: "https://images.openfoodfacts.org/images/products/406/336/743/5683/front_pl.3.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "K-Classic Pizza Tonno",
    imageUrl: "https://images.openfoodfacts.org/images/products/406/336/737/8607/front_de.8.full.jpg",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Netto ---
  {
    name: "Netto Tanta Emma Pizza Salami",
    imageUrl: "https://cdn.test.de/file/image/ct/produktbilder/330000032390/v1/15/hauptbild_original/hauptbild_original.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Netto Tanta Emma Pizza 4-KÃ¤se",
    imageUrl: "https://www.netto-online.de/media/artikel/a/a6/-5878/images/em_MondoItalianoTKKPizza4Kaese.jpg",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Netto Originale Pizza Speciale",
    imageUrl: "https://www.netto-online.de/media/artikel/0/0b/-5885/images/em_MondoItalianoTKKPizzaSpeciale.jpg",
    category: "Pizza",
    slug: "pizza",
  },

  // --- Premium Wagner Big City ---
  {
    name: "Original Wagner Big Pizza London",
    imageUrl: "https://imageproxy.wolt.com/assets/667934fb35e1b1789b040ecd",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Original Wagner Big Pizza Amsterdam",
    imageUrl: "https://www.original-wagner.de/sites/default/files/styles/square_6/public/2025-05/WAG_Big_City_Pizza_Amsterdam_720x405_Seite.png?h=2d44e782&itok=ZmYiOgnP",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Original Wagner Big Pizza Sydney",
    imageUrl: "https://www.original-wagner.de/sites/default/files/styles/square_6/public/2025-05/WAG_Big_City_Pizza_Sydney_720x405_Seite.png?h=2d44e782&itok=IghdFgHu",
    category: "Pizza",
    slug: "pizza",
  },
  {
    name: "Original Wagner Big Pizza Budapest",
    imageUrl: "https://www.original-wagner.de/sites/default/files/styles/square_6/public/2025-05/WAG_Big_City_Pizza_Budapest_720x405_Seite.png?h=2d44e782&itok=JFnVHNuG",
    category: "Pizza",
    slug: "pizza",
  },
  ];
    /* -------------------------------------- */
    /*           PROTEINRIEGEL               */
    /* -------------------------------------- */

  export const PROTEINRIEGEL_PRODUCTS: Product[] = [
  // --- Proteinriegel (Protein Bars) ---
  {
    name: "Barebells Salty Peanut",
    imageUrl: "https://barebells.com/app/uploads/2022/09/salty-peanut-1.png",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Barebells Cookies & Cream",
    imageUrl: "https://m.media-amazon.com/images/I/61Hz6yQykHL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Barebells Caramel-Cashew",
    imageUrl: "https://m.media-amazon.com/images/I/71hpT2yml+L._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Barebells White Chocolate Almond",
    imageUrl: "https://m.media-amazon.com/images/I/61F0zfll9YL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },

  // foodspring
  {
    name: "Foodspring Protein Bar Cookie Dough",
    imageUrl: "https://m.media-amazon.com/images/I/61jT0SxxGXLa._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Foodspring Protein Bar Chocolate Brownie",
    imageUrl: "https://m.media-amazon.com/images/I/71OY0Hf5n2L._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Foodspring Protein Bar Salted Peanut",
    imageUrl: "https://m.media-amazon.com/images/I/51BmJzso3SL._AC_SL1200_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },

  // ESN Designer Bar
  {
    name: "ESN Designer Bar Chocolate Crumble",
    imageUrl: "https://m.media-amazon.com/images/I/71S28bShGUL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "ESN Designer Bar Caramel Choco",
    imageUrl: "https://m.media-amazon.com/images/I/71JWmw5I80L._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "ESN Designer Bar Vanilla Crisp",
    imageUrl: "https://m.media-amazon.com/images/I/71uyVTSfCKL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },

  // MyProtein
  {
    name: "MyProtein Layered Bar Chocolate Cookie",
    imageUrl: "https://m.media-amazon.com/images/I/71+JPHhbRML._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "MyProtein Layered Bar Birthday Cake",
    imageUrl: "https://m.media-amazon.com/images/I/61P2wze7E9L._AC_SL1200_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "MyProtein Layered Bar Peanut Butter",
    imageUrl: "https://m.media-amazon.com/images/I/61yeId2n7YL._AC_SL1200_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },

  // Powerbar
  {
    name: "Powerbar Protein Plus Chocolate Brownie",
    imageUrl: "https://m.media-amazon.com/images/I/71vZyKSdrCL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Powerbar Protein Plus Vanilla Coconut",
    imageUrl: "https://m.media-amazon.com/images/I/71P3c88nQPL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },

  // Layenberger
  {
    name: "Layenberger 3K Riegel Caramel",
    imageUrl: "https://m.media-amazon.com/images/I/61e1jV2E0JL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "Layenberger 3K Riegel Schoko-Brownie",
    imageUrl: "https://m.media-amazon.com/images/I/61Bs91u1qpL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },

  // More Nutrition
  {
    name: "MORE Nutrition Bar Hazelnut Nougat",
    imageUrl: "https://m.media-amazon.com/images/I/71oGT3hk8JL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
  {
    name: "MORE Nutrition Bar White Choco Crisp",
    imageUrl: "https://m.media-amazon.com/images/I/71Osrc1e+iL._AC_SL1500_.jpg",
    category: "Proteinriegel",
    slug: "proteinriegel",
  },
];

export const PROTEINPULVER_PRODUCTS: Product[] = [
  {
    name: "ESN Designer Whey â€“ Vanilla",
    imageUrl: "https://assets.esn.com/products/Designer-Whey/Vanilla.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "ESN Designer Whey â€“ Chocolate",
    imageUrl: "https://assets.esn.com/products/Designer-Whey/Chocolate.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "ESN Designer Whey - Salted Dark Chocolate",
    imageUrl: "https://www.fitnesswebshop.de/cdn/shop/files/e_DesignerWhey_908g_Salted_Dark_Chocolate600.jpg?v=1767747678",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 387,
    protein: 72,
    fat: 7.1,
    carbs: 8,
  },
  {
    name: "ESN Designer Whey - Honey Cereal",
    imageUrl: "https://www.fitnesswebshop.de/cdn/shop/files/e_DesignerWhey_908g_HoneyCerealFlavor_600_a21d53ed-1221-4e05-8e48-db1d9ad2722f.jpg?v=1760098293",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 369,
    protein: 76,
    fat: 4.4,
    carbs: 7.2,
  },
  {
    name: "ESN Designer Whey - White Chocolate Pistachio",
    imageUrl: "https://cdn.shopify.com/s/files/1/0674/7524/3274/files/e_DesignerWhey_908g_WhiteChocolatePistachioFlavor_b1024f_1024x1024.jpg?v=1701281802",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 382,
    protein: 77,
    fat: 5.3,
    carbs: 8,
  },
  {
    name: "ESN Designer Whey - Vanilla Milk",
    imageUrl: "https://cdn.knuspr.de/images/grocery/products/117861/117861-1752160042241.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 418,
    protein: 75,
    fat: 6.2,
    carbs: 7.3,
  },
  {
    name: "ESN Designer Whey - Vanilla Ice Cream",
    imageUrl: "https://www.knuspr.de/cdn-cgi/image/f=auto,w=500,h=500,q=75/https://cdn.knuspr.de/images/grocery/products/117861/117861-1752160042241.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 381,
    protein: 78,
    fat: 4.7,
    carbs: 7.6,
  },
  {
    name: "ESN Designer Whey - Strawberry Cream",
    imageUrl: "https://www.gymchickies.com/cdn/shop/files/DesignerWhey_908g_StrawberryCreamFlavor_dunkel_jpg.webp?v=1723469829",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 387,
    protein: 81,
    fat: 5.6,
    carbs: 4.3,
  },
  {
    name: "ESN Designer Whey - Stracciatella",
    imageUrl: "https://www.rossmann.de/media-neu/134/MAM_13470664/MAM_13470664_SHOP_IMAGE_2.0.png?auto=webp&canvas=600%2C600&fit=bounds&format=webply&height=600&quality=40&width=600",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 380,
    protein: 73,
    fat: 5.3,
    carbs: 7.5,
  },
  {
    name: "ESN Designer Whey - Neutral",
    imageUrl: "https://img.bigshopper.nl/0JiAbY0R6ti_YkcWrkZUyAFBqw67EmynLUPOY_pd7Jk/rs:fit:400:400/q:90/bg:ffffff/exar:1/aHR0cHM6Ly9wcm94eS5iaWdzaG9wcGVyLmNvbS9wcm94eT91cmw9aHR0cHMlM0ElMkYlMkZtZWRpYS5zLWJvbC5jb20lMkY3S1JqTFdReVZnNTElMkZ5ODZqOHY3JTJGODAyeDEyMDAuanBnJnRsZD1ubA/.webp",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 375,
    protein: 82,
    fat: 3.8,
    carbs: 4.4,
  },
  {
    name: "ESN Designer Whey - Milky Hazelnut",
    imageUrl: "https://gzhls.at/pix/f5/a5/f5a5ab7b323e40ab-n.webp",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 374,
    protein: 74,
    fat: 4.8,
    carbs: 6.6,
  },
  {
    name: "ESN Designer Whey - Milk Chocolate",
    imageUrl: "https://cdn.idealo.com/folder/Product/201049/0/201049064/s1_produktbild_mittelgross/esn-designer-whey-protein-908g-milk-chocolate.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 374,
    protein: 72,
    fat: 5.3,
    carbs: 5.9,
  },
  {
    name: "ESN Designer Whey - Leons Cereal",
    imageUrl: "https://geizhals.de/i/92/32/2923276-n0.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 371,
    protein: 69,
    fat: 4.6,
    carbs: 11,
  },
  {
    name: "ESN Designer Whey - Dark Cookies & Cream",
    imageUrl: "https://www.hollandpharma.nl/photos/937401/photo.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 373,
    protein: 72,
    fat: 5.4,
    carbs: 9.6,
  },
  {
    name: "ESN Designer Whey - Cinnamon Cereal",
    imageUrl:
      "https://athomepharma.com/cdn/shop/files/4250519648736_A1N1.png?v=1763528219&width=120",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 386,
    protein: 76,
    fat: 6.1,
    carbs: 7.7,
  },
  {
    name: "ESN Designer Whey - Cherry Yogurt",
    imageUrl:
      "https://www.austria-nutrition.at/media/18/f9/84/1713564038/290010-1_df93b6022a8e4e7fa0d594d7cee20abc.jpg?ts=1713564038",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 372,
    protein: 71,
    fat: 4.5,
    carbs: 8.9,
  },
  {
    name: "ESN Designer Whey - Banana Milk",
    imageUrl: "https://www.hollandpharma.nl/photos/937393/photo.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 375,
    protein: 75,
    fat: 4.8,
    carbs: 6.1,
  },
  {
    name: "ESN Designer Whey - Almond Coconut",
    imageUrl: "https://www.hollandpharma.nl/photos/937395/photo.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 381,
    protein: 73,
    fat: 5.6,
    carbs: 7,
  },
  {
    name: "ESN Designer Whey - Germknödel",
    imageUrl:
      "https://www.esn.com/cdn/shop/files/DesignerWhey_908g_Germkn_delFlavor_dunkel-xhNWlupg.jpg?v=1766394269&width=720",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 376,
    protein: 77,
    fat: 5.4,
    carbs: 7.1,
  },
  {
    name: "ESN Designer Whey - Peanutbutter Cup",
    imageUrl: "https://www.fitnesswebshop.de/cdn/shop/files/e_DesignerWhey_908g_LE_PeanutButterCup_600.jpg?v=1763398769",
    category: "Proteinpulver",
    slug: "proteinpulver",
    price: "€43,94/kg",
    kcal: 380,
    protein: 74,
    fat: 4.7,
    carbs: 9.1,
  },
  {
    name: "ESN Designer Whey â€“ Strawberry",
    imageUrl: "https://assets.esn.com/products/Designer-Whey/Strawberry.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "ESN Isoclear Whey Isolate â€“ Lemon Ice Tea",
    imageUrl: "https://assets.esn.com/products/IsoClear/Lemon-Ice-Tea.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "ESN Isoclear Whey Isolate â€“ Peach Ice Tea",
    imageUrl: "https://assets.esn.com/products/IsoClear/Peach-Ice-Tea.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "MyProtein Impact Whey â€“ Vanilla",
    imageUrl: "https://static.myprotein.com/cms/images/mp/products/10530943/vanilla.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "MyProtein Impact Whey â€“ Chocolate Smooth",
    imageUrl: "https://static.myprotein.com/cms/images/mp/products/10530943/chocolate-smooth.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "MyProtein Clear Whey â€“ Orange Mango",
    imageUrl: "https://static.myprotein.com/cms/images/mp/products/12081327/orange-mango.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "MyProtein Clear Whey â€“ Peach Tea",
    imageUrl: "https://static.myprotein.com/cms/images/mp/products/12081327/peach-tea.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Optimum Nutrition Gold Standard Whey â€“ Vanilla",
    imageUrl: "https://m.media-amazon.com/images/I/71nFh88opnL._AC_SL1500_.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Optimum Nutrition Gold Standard Whey â€“ Chocolate",
    imageUrl: "https://m.media-amazon.com/images/I/71g-HlGMvCL._AC_SL1500_.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Dymatize ISO100 â€“ Birthday Cake",
    imageUrl: "https://m.media-amazon.com/images/I/71Q8k4GXmGL._AC_SL1500_.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Dymatize ISO100 â€“ Chocolate Peanut",
    imageUrl: "https://m.media-amazon.com/images/I/71N99nN1xLL._AC_SL1500_.jpg",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Foodspring Whey Protein â€“ Vanilla",
    imageUrl: "https://cdn.foodspring.com/media/catalog/product/w/h/whey_protein_vanilla_450g_600x600.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Foodspring Whey Protein â€“ Chocolate",
    imageUrl: "https://cdn.foodspring.com/media/catalog/product/w/h/whey_protein_chocolate_450g_600x600.png",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Rocka Whey Isolate â€“ Vanilla Sky",
    imageUrl: "https://rockanutrition.de/cdn/shop/products/VanillaSky.png?v=1668504635",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  {
    name: "Rocka Whey Isolate â€“ Hazelnut Nougat",
    imageUrl: "https://rockanutrition.de/cdn/shop/products/HazelnutNougat.png?v=1668504635",
    category: "Proteinpulver",
    slug: "proteinpulver",
  },
  ...MORE_NUTRITION_PROTEINPULVER_PRODUCTS,
];
export const Eis_PRODUCTS: Product[] = [
  {
    name: "Ben & Jerry",
    imageUrl: "https://rockanutrition.de/cdn/shop/products/HazelnutNougat.png?v=1668504635",
    category: "Eis",
    slug: "eis",
  },
];

export const CHIPS_PRODUCTS: Product[] = [
  {
    name: "Pringles Paprika",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Pringles Sour Cream",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Funny Frisch Ungarisch",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Funny Frisch Chipsfrisch Paprika",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Chio Tortillas",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Lorenz Crunchips Paprika",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Kettle Chips Sea Salt",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Kettle Chips Balsamic Vinegar",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
  {
    name: "Lays Classic",
    imageUrl: "",
    category: "Chips",
    slug: "chips",
  },
];

/* -------------------------------------- */
/*           ALLE PRODUKTE               */
/* -------------------------------------- */

export const ALL_PRODUCTS: Product[] = [
  ...PIZZA_PRODUCTS,
  ...PROTEINRIEGEL_PRODUCTS,
  ...PROTEINPULVER_PRODUCTS,
  ...Eis_PRODUCTS,
  ...CHIPS_PRODUCTS,
];
