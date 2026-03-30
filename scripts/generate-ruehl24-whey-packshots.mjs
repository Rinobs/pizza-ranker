import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "images", "generated");

mkdirSync(OUTPUT_DIR, { recursive: true });

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function multiline(lines, x, y, options = {}) {
  const {
    size = 76,
    lineHeight = 74,
    weight = 800,
    fill = "#FFFFFF",
    align = "start",
  } = options;

  const anchor = align === "center" ? ' text-anchor="middle"' : "";

  return `<text x="${x}" y="${y}"${anchor} fill="${fill}" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="-0.02em">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("")}</text>`;
}

function createPackshot(flavor) {
  const lines = flavor.lines;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="112" y="64" width="976" height="1432" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="34" stdDeviation="28" flood-color="#06111F" flood-opacity="0.28"/>
    </filter>
    <linearGradient id="bagBody" x1="202" y1="156" x2="996" y2="1386" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${flavor.top}"/>
      <stop offset="1" stop-color="${flavor.bottom}"/>
    </linearGradient>
    <linearGradient id="gloss" x1="244" y1="172" x2="918" y2="1268" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.38"/>
      <stop offset="0.24" stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="labelFade" x1="324" y1="432" x2="876" y2="1044" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.04)"/>
    </linearGradient>
    <linearGradient id="scoopPowder" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F7F0E6"/>
      <stop offset="1" stop-color="${flavor.accentSoft}"/>
    </linearGradient>
  </defs>
  <ellipse cx="602" cy="1424" rx="284" ry="74" fill="#06101C" opacity="0.16"/>
  <g filter="url(#shadow)">
    <path d="M238 188C312 126 890 126 964 188L1016 1176C1020 1268 948 1350 856 1380C764 1410 440 1410 348 1380C256 1350 184 1268 188 1176L238 188Z" fill="url(#bagBody)"/>
    <path d="M258 204C326 150 876 150 944 204L988 1168C991 1242 930 1308 852 1330C760 1356 444 1356 350 1330C272 1308 211 1242 214 1168L258 204Z" fill="rgba(255,255,255,0.12)"/>
    <path d="M240 196C310 134 892 134 962 196" stroke="rgba(255,255,255,0.22)" stroke-width="16" stroke-linecap="round"/>
    <path d="M204 1168C312 1280 890 1280 998 1168" stroke="rgba(8,18,32,0.14)" stroke-width="22" stroke-linecap="round"/>
    <path d="M242 190C318 126 886 126 962 190L938 1262C924 1324 872 1362 810 1378C714 1402 490 1402 392 1378C330 1362 278 1324 264 1262L242 190Z" fill="url(#gloss)"/>

    <rect x="270" y="230" width="660" height="132" rx="40" fill="rgba(8,18,32,0.22)"/>
    <text x="600" y="314" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Arial Black&quot;, &quot;Segoe UI&quot;, sans-serif" font-size="72" font-weight="900" letter-spacing="0.08em">RÜHL24</text>

    <rect x="328" y="424" width="544" height="540" rx="72" fill="rgba(9,17,27,0.24)"/>
    <rect x="348" y="446" width="504" height="496" rx="58" fill="rgba(255,255,255,0.1)"/>
    <rect x="348" y="446" width="504" height="496" rx="58" fill="url(#labelFade)" opacity="0.5"/>

    <text x="600" y="548" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="48" font-weight="800" letter-spacing="0.16em">WHEY PROTEIN</text>
    <text x="600" y="602" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="0.22em">KONZENTRAT</text>

    ${multiline(lines, 600, 700, {
      size: lines.length >= 3 ? 64 : 76,
      lineHeight: lines.length >= 3 ? 62 : 72,
      fill: "#FFFFFF",
      align: "center",
    })}

    <rect x="390" y="842" width="420" height="70" rx="28" fill="${flavor.accent}" opacity="0.96"/>
    <text x="600" y="886" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="0.18em">1 KG • MADE IN GERMANY</text>

    <circle cx="836" cy="490" r="92" fill="${flavor.accent}" opacity="0.28"/>
    <circle cx="382" cy="1038" r="124" fill="${flavor.accent}" opacity="0.18"/>

    <g transform="translate(664 1010)">
      <rect x="86" y="60" width="152" height="34" rx="17" fill="${flavor.accent}" transform="rotate(-22 86 60)"/>
      <ellipse cx="86" cy="84" rx="110" ry="62" fill="url(#scoopPowder)"/>
      <ellipse cx="66" cy="62" rx="48" ry="22" fill="#FFFFFF" opacity="0.42"/>
      <circle cx="176" cy="42" r="12" fill="#FFFFFF" opacity="0.4"/>
      <circle cx="206" cy="74" r="8" fill="#FFFFFF" opacity="0.28"/>
    </g>

    <rect x="272" y="1126" width="656" height="126" rx="42" fill="rgba(8,18,32,0.2)"/>
    <text x="600" y="1188" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="0.18em">RÜHL24 WHEY</text>
    <text x="600" y="1234" text-anchor="middle" fill="rgba(255,255,255,0.86)" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="28" font-weight="700">Lokales, schnelles Packshot für FoodRanker</text>
  </g>
</svg>
`;
}

const FLAVORS = [
  {
    file: "ruehl24-whey-protein-konzentrat-vanillekipferl.svg",
    lines: ["Vanille", "kipferl"],
    top: "#E7C77D",
    bottom: "#8E6930",
    accent: "#6B431D",
    accentSoft: "#F8E6B8",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-lebkuchen.svg",
    lines: ["Lebkuchen"],
    top: "#915330",
    bottom: "#572515",
    accent: "#D7A35A",
    accentSoft: "#F0D1A5",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-milchschokolade.svg",
    lines: ["Milch", "schokolade"],
    top: "#7F4D32",
    bottom: "#432419",
    accent: "#D9B28B",
    accentSoft: "#F4E1CC",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-vanille.svg",
    lines: ["Vanille"],
    top: "#E7D487",
    bottom: "#AD8734",
    accent: "#6D5120",
    accentSoft: "#FFF0BD",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-cookies-and-cream.svg",
    lines: ["Cookies &", "Cream"],
    top: "#B5B2C4",
    bottom: "#57546D",
    accent: "#2C1F1A",
    accentSoft: "#ECE9F3",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-zitronenkuchen.svg",
    lines: ["Zitronen", "kuchen"],
    top: "#F1D956",
    bottom: "#B88A16",
    accent: "#7C6415",
    accentSoft: "#FFF2B8",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-haselnuss.svg",
    lines: ["Haselnuss"],
    top: "#9B6A44",
    bottom: "#593420",
    accent: "#D4B08B",
    accentSoft: "#F2DFCB",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-orange-maracuja.svg",
    lines: ["Orange", "Maracuja"],
    top: "#F28B22",
    bottom: "#BC4308",
    accent: "#F5D462",
    accentSoft: "#FFE9A9",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-apfelstrudel.svg",
    lines: ["Apfel", "strudel"],
    top: "#D7AF72",
    bottom: "#875B2F",
    accent: "#B84031",
    accentSoft: "#F1D9B8",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-milchreis-zimt.svg",
    lines: ["Milchreis", "Zimt"],
    top: "#ECE1C7",
    bottom: "#AF7E45",
    accent: "#7F4E24",
    accentSoft: "#F7EFE1",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-joghurt.svg",
    lines: ["Joghurt"],
    top: "#D8E7F5",
    bottom: "#7A9EC6",
    accent: "#FFFFFF",
    accentSoft: "#F8FBFF",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-kirsche.svg",
    lines: ["Kirsche"],
    top: "#D73C4E",
    bottom: "#811228",
    accent: "#FFD3DA",
    accentSoft: "#FFE6EA",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-cookies.svg",
    lines: ["Cookies"],
    top: "#8A5A42",
    bottom: "#4A3025",
    accent: "#F0D5BC",
    accentSoft: "#F7E9DC",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-pur-ohne-alles.svg",
    lines: ["Pur ohne", "alles"],
    top: "#DCE2E9",
    bottom: "#7C8799",
    accent: "#203045",
    accentSoft: "#F2F5F8",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-mango.svg",
    lines: ["Mango"],
    top: "#F7A834",
    bottom: "#DA6013",
    accent: "#FFE17A",
    accentSoft: "#FFF0BE",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-karamell.svg",
    lines: ["Karamell"],
    top: "#BC7B3C",
    bottom: "#6A391A",
    accent: "#F3CD94",
    accentSoft: "#F9E7CB",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-banane.svg",
    lines: ["Banane"],
    top: "#F6D94E",
    bottom: "#B18811",
    accent: "#FFF3A7",
    accentSoft: "#FFF7C8",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-weisse-schokolade.svg",
    lines: ["Weiße", "Schokolade"],
    top: "#F3ECE3",
    bottom: "#B89F7D",
    accent: "#FFFDF9",
    accentSoft: "#FFFFFF",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-bananensplit.svg",
    lines: ["Bananen", "split"],
    top: "#F3D95C",
    bottom: "#A86D24",
    accent: "#FFF6C7",
    accentSoft: "#FFF9D9",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-gebrannte-mandeln.svg",
    lines: ["Gebrannte", "Mandeln"],
    top: "#AF672F",
    bottom: "#693918",
    accent: "#FFD8A4",
    accentSoft: "#F8E5C9",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-erdbeere.svg",
    lines: ["Erdbeere"],
    top: "#E75172",
    bottom: "#9C183E",
    accent: "#FFD6E0",
    accentSoft: "#FFE6ED",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-erdnussbutter.svg",
    lines: ["Erdnuss", "butter"],
    top: "#C48437",
    bottom: "#77481A",
    accent: "#F2D0A2",
    accentSoft: "#F8E6CB",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-kokosnuss.svg",
    lines: ["Kokos", "nuss"],
    top: "#EEF5F6",
    bottom: "#72A4A7",
    accent: "#FFFFFF",
    accentSoft: "#F9FEFF",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-pistazien-eis.svg",
    lines: ["Pistazien", "Eis"],
    top: "#AFD77D",
    bottom: "#557A2E",
    accent: "#F6FFEE",
    accentSoft: "#F9FFF3",
  },
  {
    file: "ruehl24-whey-protein-konzentrat-creme-brulee.svg",
    lines: ["Crème", "Brûlée"],
    top: "#E4BF70",
    bottom: "#8B6121",
    accent: "#FFF0C8",
    accentSoft: "#FFF7E1",
  },
];

for (const flavor of FLAVORS) {
  writeFileSync(path.join(OUTPUT_DIR, flavor.file), createPackshot(flavor), "utf8");
}

console.log(`Generated ${FLAVORS.length} Rühl24 whey packshots in ${OUTPUT_DIR}`);
