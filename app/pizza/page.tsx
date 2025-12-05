"use client";

import CategoryPage from "../category-template/page-template";

const ALL_PIZZAS = [
  // --- Dr. Oetker Ristorante ---
  {
    name: "Dr. Oetker Ristorante Mozzarella",
    slug: "dr-oetker-ristorante-mozzarella",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/481/9806/front_en.247.full.jpg"
  },
  {
    name: "Dr. Oetker Ristorante Margherita",
    slug: "dr-oetker-ristorante-margherita",
    imageUrl: "https://dutchshopper.com/cdn/shop/files/648185_19ef9a29-b65a-45c1-aefe-3c5e3773bc9b.png?crop=center&height=500&v=1736659229&width=600"
  },
  {
    name: "Dr. Oetker Ristorante Funghi",
    slug: "dr-oetker-ristorante-funghi",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/481/9103/front_en.94.full.jpg"
  },
  {
    name: "Dr. Oetker Ristorante Salame",
    slug: "dr-oetker-ristorante-salame",
    imageUrl: "https://www.geestsprudel.de/cdn/shop/files/dr-oetker-pizza-ristorante-salami-packung-320g_1613039144_86d6a54d-e4fb-4c9c-bc63-db0bce6a25b6.jpg?v=1713209794"
  },
  {
    name: "Dr. Oetker Ristorante Speciale",
    slug: "dr-oetker-ristorante-speciale",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfp47tfun206w7o0mjr3w7"
  },
  {
    name: "Dr. Oetker Ristorante Pollo",
    slug: "dr-oetker-ristorante-pollo",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/482/0000/front_fr.104.full.jpg"
  },
  {
    name: "Dr. Oetker Ristorante Quattro Formaggi",
    slug: "dr-oetker-ristorante-quattro-formaggi",
    imageUrl: "https://images.openfoodfacts.org/images/products/400/172/481/8908/front_de.203.full.jpg"
  },
  {
    name: "Dr. Oetker Ristorante Prosciutto",
    slug: "dr-oetker-ristorante-prosciutto",
    imageUrl: "https://img.rewe-static.de/7828363/34878401_digital-image.png?imwidth=840&impolicy=pdp"
  },
  {
    name: "Dr. Oetker Ristorante Hawaii",
    slug: "dr-oetker-ristorante-hawaii",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfpo1bfl5x06vxdc6cg33g"
  },
  {
    name: "Dr. Oetker Ristorante Spinaci",
    slug: "dr-oetker-ristorante-spinaci",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmijfsaueg3fq07uoup5pavlq?opt"
  },
  {
    name: "Dr. Oetker Ristorante Margherita Pomodori",
    slug: "dr-oetker-ristorante-margherita-pomodori",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmijfdjg8ewlt06un9pueh24u?opt"
  },
  {
    name: "Dr. Oetker Ristorante Tonno",
    slug: "dr-oetker-ristorante-tonno",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfef6nexc608w667ffjym7"
  },
  {
    name: "Dr. Oetker Ristorante Pepperoni Salame",
    slug: "dr-oetker-ristorante-pepperoni-salame",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmhtqj2dgc0mp07w8jb17nlsx?opt"
  },

  // --- Dr. Oetker Tradizionale ---
  {
    name: "Dr. Oetker Tradizionale Speciale",
    slug: "dr-oetker-tradizionale-speciale",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmijfietaf9ru06untu16bqwn?opt"
  },
  {
    name: "Dr. Oetker Tradizionale Salame",
    slug: "dr-oetker-tradizionale-salame",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijhlmtykl3407uieomj1qbj"
  },
  {
    name: "Dr. Oetker Tradizionale Mozzarella E Pesto",
    slug: "dr-oetker-tradizionale-mozzarella-e-pesto",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfiypif7ca07ui9cscqgir"
  },
  {
    name: "Dr. Oetker Tradizionale Tonno",
    slug: "dr-oetker-tradizionale-tonno",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmhtpx1om8qnd07w04ibpm5ni"
  },
  {
    name: "Dr. Oetker Tradizionale Margherita",
    slug: "dr-oetker-tradizionale-margherita",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmhtpw8c28tv607uul1eq1gff?opt"
  },
  {
    name: "Dr. Oetker Tradizionale Quattro Formaggi",
    slug: "dr-oetker-tradizionale-quattro-formaggi",
    imageUrl: "https://img.rewe-static.de/8705058/35088968_digital-image.png?imwidth=840&impolicy=pdp"
  },
  {
    name: "Dr. Oetker Tradizionale Spinaci E Ricotta",
    slug: "dr-oetker-tradizionale-spinaci-e-ricotta",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfw6jig4v207uizhtrctke"
  },
  {
    name: "Dr. Oetker Tradizionale Diavola Calabrese",
    slug: "dr-oetker-tradizionale-diavola-calabrese",
    imageUrl: "https://www.oetker.de/assets/hygraph/AVtdz8Pl3QxerK0kYX32fz/compress=metadata:true/quality=value:75/output=format:webp/resize=fit:clip,height:662,width:662/cmhtql52lcipu07uvicx99sca?opt"
  },

  // --- Casa di Mama ---
  {
    name: "Dr. Oetker Casa di Mama Speciale",
    slug: "dr-oetker-casa-di-mama-speciale",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfbdp0esm407uo19c62azr"
  },
  {
    name: "Dr. Oetker Casa di Mama Salame",
    slug: "dr-oetker-casa-di-mama-salame",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmdemawtldtqg08uli16ywv4h"
  },
  {
    name: "Dr. Oetker Casa di Mama Quattro Formaggi",
    slug: "dr-oetker-casa-di-mama-quattro-formaggi",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmijfx0llgenn07uox4d7suth"
  },
  {
    name: "Dr. Oetker Casa di Mama Tonno",
    slug: "dr-oetker-casa-di-mama-tonno",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmi811mpoc3cq07vwtcf2ed1w"
  },
  {
    name: "Dr. Oetker Casa di Mama Margherita",
    slug: "dr-oetker-casa-di-mama-margherita",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmi9eokcf95cd07w1out6mml2"
  },
  {
    name: "Dr. Oetker Casa di Mama Hawaii",
    slug: "dr-oetker-casa-di-mama-hawaii",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmidp84lanv6x07uolikw6ze8"
  },
  {
    name: "Dr. Oetker Casa di Mama Diavola",
    slug: "dr-oetker-casa-di-mama-diavola",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmi802k6783cy07vw64t130zn"
  },

  // --- SUPREMA ---
  {
    name: "Dr. Oetker SUPREMA Salami",
    slug: "dr-oetker-suprema-salami",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmden7bpgg4x408vuei6mx6xq"
  },
  {
    name: "Dr. Oetker SUPREMA Calabrese & Nduja",
    slug: "dr-oetker-suprema-calabrese-nduja",
    imageUrl: "https://eu-central-1-droetker.graphassets.com/AVtdz8Pl3QxerK0kYX32fz/cmden7721g64407w0f4cna2j5"
  },
  {
    name: "Dr. Oetker SUPREMA Margherita",
    slug: "dr-oetker-suprema-margherita",
    imageUrl: "https://img.rewe-static.de/9977185/44315103_digital-image.png"
  },

  // --- Wagner Steinofen ---
  {
    name: "Wagner Steinofen Margherita",
    slug: "wagner-steinofen-margherita",
    imageUrl: "https://www.original-wagner.de/sites/default/files/2025-01/STO_Margherita_15Grad.png"
  },
  {
    name: "Wagner Steinofen Salami",
    slug: "wagner-steinofen-salami",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRx9WBB5tpbElXRoLYFZWUh2eFv66Db4cUmsQ&s"
  },
  {
    name: "Wagner Steinofen Speciale",
    slug: "wagner-steinofen-speciale",
    imageUrl: "https://www.original-wagner.de/sites/default/files/2025-01/STO_Speciale_15Grad.png"
  },
  {
    name: "Wagner Steinofen Peperoni-Salami",
    slug: "wagner-steinofen-peperoni-salami",
    imageUrl: "https://www.original-wagner.de/sites/default/files/2025-01/STO_Peperoni_15Grad.png"
  },
  {
    name: "Wagner Steinofen Hawaii",
    slug: "wagner-steinofen-hawaii",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFDoew29FRy3F5FnHZbDrtyrR-wO5EwrfPAA&s"
  },
  {
    name: "Wagner Steinofen Tonno",
    slug: "wagner-steinofen-tonno",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgwUnNEiCF48Imp5pBICpNSjHfdNatctDCFA&s"
  },
  {
    name: "Wagner Steinofen Spinat",
    slug: "wagner-steinofen-spinat",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQU1Q3LImrHDfuMuEo4NYUHDDRfMzUwZGrzA&s"
  },
  {
    name: "Wagner Steinofen Piccolinis Salami",
    slug: "wagner-steinofen-piccolinis-salami",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQG2KAImEW977rpj2ftJPFtBb-2C7Fn3tBowQ&s"
  },
  {
    name: "Wagner Steinofen Piccolinis Speciale",
    slug: "wagner-steinofen-piccolinis-speciale",
    imageUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOOTem-6AOznhoPgQTZYGCWWzZaBAzg2SvAg&s"
  },
  {
    name: "Wagner Steinofen Piccolinis Elsässer Art",
    slug: "wagner-steinofen-piccolinis-elsaesser-art",
    imageUrl: "https://img.hit.de/sortiment/4009/2330/1404/4009233014040_43064635_720px.webp"
  },

  // --- Gustavo Gusto ---
  {
    name: "Gustavo Gusto Margherita",
    slug: "gustavo-gusto-margherita",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/07/GUSTAVO-GUSTO-MARGHERITA-PIZZA-1.jpeg"
  },
  {
    name: "Gustavo Gusto Salame",
    slug: "gustavo-gusto-salame",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/SALAMI-700x700.jpeg"
  },
  {
    name: "Gustavo Gusto Prosciutto E Funghi",
    slug: "gustavo-gusto-prosciutto-e-funghi",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/PROSCIUTTOFUNGHI.jpeg"
  },
  {
    name: "Gustavo Gusto Tonno",
    slug: "gustavo-gusto-tonno",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2021/02/tiefkuehlpizza-thunfisch-gustavo-700x700.png"
  },
  {
    name: "Gustavo Gusto Salame Piccante",
    slug: "gustavo-gusto-salame-piccante",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/PICCANTE.jpeg"
  },
  {
    name: "Gustavo Gusto Spinaci",
    slug: "gustavo-gusto-spinaci",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/SPINACI-700x700.jpg"
  },
  {
    name: "Gustavo Gusto Hawaii",
    slug: "gustavo-gusto-hawaii",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2022/06/ANANAS-700x700.jpeg"
  },
  {
    name: "Gustavo Gusto New York Style",
    slug: "gustavo-gusto-new-york-style",
    imageUrl: "https://gustavo-gusto.de/wp-content/uploads/2025/02/New-York-Style-Pizza-Karton-Gustavo-Gusto-700x700.jpg"
  },

  // --- Lidl Trattoria Alfredo ---
  {
    name: "Lidl Trattoria Alfredo Salami",
    slug: "lidl-trattoria-alfredo-salami",
    imageUrl: "https://cdn.test.de/file/image/ct/produktbilder/330000032390/v1/14/hauptbild_original/hauptbild_original.jpg"
  },
  {
    name: "Lidl Trattoria Alfredo Margherita",
    slug: "lidl-trattoria-alfredo-margherita",
    imageUrl: "https://images.openfoodfacts.org/images/products/405/648/944/3025/front_de.26.full.jpg"
  },
  {
    name: "Lidl Trattoria Alfredo Speciale",
    slug: "lidl-trattoria-alfredo-speciale",
    imageUrl: "https://images.openfoodfacts.org/images/products/405/648/945/2454/front_en.4.full.jpg"
  },
  {
    name: "Lidl Trattoria Alfredo Spinaci",
    slug: "lidl-trattoria-alfredo-spinaci",
    imageUrl: "https://images.openfoodfacts.org/images/products/405/648/944/2967/front_de.9.full.jpg"
  },
  {
    name: "Lidl Trattoria Alfredo Tonno",
    slug: "lidl-trattoria-alfredo-tonno",
    imageUrl: "https://www.mustakshif.com/public/uploads/products/stonebaked-pizza-tonno_4056489691952_Mustakshif.jpg"
  },

  // --- Aldi / GutBio ---
  {
    name: "Aldi Casa Romana Salami",
    slug: "aldi-casa-romana-salami",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/produkte/tiefgekuehltes/6840_44-2021_TKSTEINOFENPIZZASALAMI3X350G-01_ON.png/_jcr_content/renditions/opt.1250w.png.res/1631601306424/opt.1250w.png"
  },
  {
    name: "Aldi Casa Romana Margherita",
    slug: "aldi-casa-romana-margherita",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/produkte/vollsortiment/6712_44-2021_TKSTEINOFENPIZZAMARGHERITA-01_ON.png/_jcr_content/renditions/opt.1250w.png.res/1706168268425/opt.1250w.png"
  },
  {
    name: "Aldi Casa Romana Speciale",
    slug: "aldi-casa-romana-speciale",
    imageUrl: "https://s7g10.scene7.com/is/image/aldi/202505300073"
  },
  {
    name: "Aldi Casa Romana Tonno",
    slug: "aldi-casa-romana-tonno",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/angebote/2020/kw46/produkte/6880_47-2020_Pizz-Ah_PizzaTonno_ON.png/_jcr_content/renditions/opt.1250w.png.res/1604486364395/opt.1250w.png"
  },
  {
    name: "Aldi Gigante Salami",
    slug: "aldi-gigante-salami",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/angebote/2022/kw39/hero/1017255_39-2022_GustoGigante-Rindersalami_ON1.png/_jcr_content/renditions/opt.1250w.png.res/1662731586956/opt.1250w.png"
  },
  {
    name: "Aldi Gigante Mozzarella",
    slug: "aldi-gigante-mozzarella",
    imageUrl: "https://www.aldi-nord.de/content/dam/aldi/germany/angebote/2022/kw39/hero/1017255_39-2022_GustoGigante-Mozzarella_ON1.png/_jcr_content/renditions/opt.1250w.png.res/1662731562524/opt.1250w.png"
  },

  // --- Penny San Fabio ---
  {
    name: "Penny San Fabio Margherita",
    slug: "penny-san-fabio-margherita",
    imageUrl: "https://images.openfoodfacts.org/images/products/433/725/681/8254/front_de.9.full.jpg"
  },
  {
    name: "Penny San Fabio Salami",
    slug: "penny-san-fabio-salami",
    imageUrl: "https://images.openfoodfacts.org/images/products/433/725/682/2305/front_de.7.full.jpg"
  },
  {
    name: "Penny San Fabio Spinaci",
    slug: "penny-san-fabio-spinaci",
    imageUrl: "https://image.jimcdn.com/app/cms/image/transf/none/path/sf03b1c85b4db8d52/image/ie0d0f70215bb024c/version/1516225192/image.png"
  },
  {
    name: "Penny San Fabio Tonno",
    slug: "penny-san-fabio-tonno",
    imageUrl: "https://image.jimcdn.com/app/cms/image/transf/none/path/sf03b1c85b4db8d52/image/i4e0fb2d8df04eb23/version/1516225660/image.png"
  },
  {
    name: "Penny San Fabio Prosciutto",
    slug: "penny-san-fabio-prosciutto",
    imageUrl: "https://hazhozabc.hu/sites/default/files/styles/large/public/tartalomkepek/pizza_sonkas.png?itok=TfvfDy2I"
  },

  // --- Rewe Beste Wahl ---
  {
    name: "Rewe Beste Wahl Salami",
    slug: "rewe-beste-wahl-salami",
    imageUrl:"https://img.rewe-static.de/7616343/43860356_digital-image.png?imwidth=840&impolicy=pdp"
  },
  {
    name: "Rewe Beste Wahl Margherita",
    slug: "rewe-beste-wahl-margherita",
    imageUrl: "https://img.rewe-static.de/7618551/43204024_digital-image.png?imwidth=840&impolicy=pdp"
  },
  {
    name: "Rewe Beste Wahl Ziegenkäse",
    slug: "rewe-beste-wahl-ziegenkaese",
    imageUrl: "https://img.rewe-static.de/8196324/28584137_digital-image.png?imwidth=840&impolicy=pdp"
  },

  // --- Edeka G&G ---
  {
    name: "Edeka G&G Salami",
    slug: "edeka-gg-salami",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v2/DV019_4311501658185_PER.png"
  },
  {
    name: "Edeka G&G Margherita",
    slug: "edeka-gg-margherita",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v3/DV019_4311501674345_PER.png"
  },
  {
    name: "Edeka G&G Speciale",
    slug: "edeka-gg-speciale",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v2/DV019_4311501677292_PER.png"
  },
  {
    name: "Edeka G&G Hawaii",
    slug: "edeka-gg-hawaii",
    imageUrl: "https://lebensmittel-versand.eu/media/image/product/59691/md/gg-steinpizza-hawaii-2x355g.jpg"
  },
  {
    name: "Edeka G&G Double Salami",
    slug: "edeka-gg-double-salami",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v3/DV019_4311501665589_PER.png"
  },
  {
    name: "Edeka G&G Tonno",
    slug: "edeka-gg-tonno",
    imageUrl: "https://cdn.produkte.edeka/d110001/derivates/17/288/812/$v2/DV019_4311501676653_PER.png"
  },

  // --- K-Classic ---
  {
    name: "K-Classic Pizza Salami",
    slug: "k-classic-pizza-salami",
    imageUrl: "https://cdn.test.de/file/image/ct/produktbilder/330000032390/v1/13/hauptbild_original/hauptbild_original.jpg"
  },
  {
    name: "K-Classic Pizza Margherita",
    slug: "k-classic-pizza-margherita",
    imageUrl: "https://images.openfoodfacts.org/images/products/406/336/743/5683/front_pl.3.full.jpg"
  },
  {
    name: "K-Classic Pizza Tonno",
    slug: "k-classic-pizza-tonno",
    imageUrl: "https://images.openfoodfacts.org/images/products/406/336/737/8607/front_de.8.full.jpg"
  },

  // --- Netto / Originale ---
  {
    name: "Netto Tanta Emma Pizza Salami",
    slug: "netto-tanta-emma-pizza-salami",
    imageUrl:"https://cdn.test.de/file/image/ct/produktbilder/330000032390/v1/15/hauptbild_original/hauptbild_original.jpg"
  },
  {
    name: "Netto Tanta Emma Pizza 4-Käse",
    slug: "netto-tanta-emma-pizza-4-kaese",
    imageUrl: "https://www.netto-online.de/media/artikel/a/a6/-5878/images/em_MondoItalianoTKKPizza4Kaese.jpg"
  },
  {
    name: "Netto Originale Pizza Speciale",
    slug: "netto-originale-pizza-speciale",
    imageUrl: "https://www.netto-online.de/media/artikel/0/0b/-5885/images/em_MondoItalianoTKKPizzaSpeciale.jpg"
  },

  // --- Wagner Big Pizza ---
  {
    name: "Original Wagner Big Pizza London",
    slug: "wagner-big-pizza-london",
    imageUrl: "https://imageproxy.wolt.com/assets/667934fb35e1b1789b040ecd"
  },
  {
    name: "Original Wagner Big Pizza Amsterdam",
    slug: "wagner-big-pizza-amsterdam",
    imageUrl: "https://www.original-wagner.de/sites/default/files/styles/square_6/public/2025-05/WAG_Big_City_Pizza_Amsterdam_720x405_Seite.png?h=2d44e782&itok=ZmYiOgnP"
  },
  {
    name: "Original Wagner Big Pizza Sydney",
    slug: "wagner-big-pizza-sydney",
    imageUrl: "https://www.original-wagner.de/sites/default/files/styles/square_6/public/2025-05/WAG_Big_City_Pizza_Sydney_720x405_Seite.png?h=2d44e782&itok=IghdFgHu"
  },
  {
    name: "Original Wagner Big Pizza Budapest",
    slug: "wagner-big-pizza-budapest",
    imageUrl: "https://www.original-wagner.de/sites/default/files/styles/square_6/public/2025-05/WAG_Big_City_Pizza_Budapest_720x405_Seite.png?h=2d44e782&itok=JFnVHNuG"
  },
];

export default function Tiefkühlpizza() {
  return (
    <CategoryPage
      title="Tiefkühlpizza"
      icon="🍕"
      storageKey="tiefkühlpizza"
      products={ALL_PIZZAS}
    />
  );
}
