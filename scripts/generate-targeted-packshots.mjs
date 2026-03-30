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

function svg(content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1600" viewBox="0 0 1200 1600" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="80" y="40" width="1040" height="1500" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="34" stdDeviation="30" flood-color="#06111F" flood-opacity="0.28"/>
    </filter>
    <linearGradient id="gloss" x1="260" y1="140" x2="940" y2="1320" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/>
      <stop offset="0.25" stop-color="#FFFFFF" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="chip" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF0C8"/>
      <stop offset="1" stop-color="#E6B96F"/>
    </linearGradient>
  </defs>
  ${content}
</svg>
`;
}

function writeAsset(name, markup) {
  writeFileSync(path.join(OUTPUT_DIR, name), markup, "utf8");
}

function multiline(
  lines,
  { x, y, size = 66, lineHeight = 60, weight = 800, fill = "#FFFFFF", raw = false }
) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="-0.02em">${lines
    .map(
      (line, index) =>
        `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${
          raw ? line : escapeXml(line)
        }</tspan>`
    )
    .join("")}</text>`;
}

function chip(x, y, rotate = 0, scale = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <ellipse cx="0" cy="0" rx="118" ry="84" fill="url(#chip)"/>
    <ellipse cx="-20" cy="-18" rx="46" ry="28" fill="#FFF6DE" opacity="0.55"/>
    <ellipse cx="22" cy="18" rx="80" ry="50" fill="#D39A4E" opacity="0.18"/>
  </g>`;
}

function saltCrystals() {
  return `
    <rect x="765" y="1075" width="28" height="28" rx="6" fill="#F7FBFF" transform="rotate(18 765 1075)"/>
    <rect x="824" y="1048" width="24" height="24" rx="5" fill="#F7FBFF" opacity="0.94" transform="rotate(-14 824 1048)"/>
    <rect x="866" y="1115" width="20" height="20" rx="4" fill="#F7FBFF" opacity="0.9" transform="rotate(12 866 1115)"/>
  `;
}

function paprikaGarnish() {
  return `
    <path d="M770 1036C832 956 906 959 930 1028C949 1084 914 1142 848 1166C812 1178 778 1164 764 1130C748 1090 751 1060 770 1036Z" fill="#D83A2E"/>
    <path d="M842 1021C845 994 861 980 889 983" stroke="#2F8F46" stroke-width="14" stroke-linecap="round"/>
    <circle cx="808" cy="1100" r="14" fill="#FBE5B8" opacity="0.7"/>
    <circle cx="852" cy="1079" r="12" fill="#FBE5B8" opacity="0.7"/>
  `;
}

function onionGarnish() {
  return `
    <circle cx="838" cy="1088" r="64" stroke="#F4F4E9" stroke-width="22"/>
    <circle cx="838" cy="1088" r="32" stroke="#D5D6CB" stroke-width="14"/>
    <circle cx="915" cy="1134" r="28" fill="#F8F8EF"/>
    <circle cx="892" cy="1114" r="18" fill="#F1F1E7" opacity="0.88"/>
    <path d="M760 1158C785 1126 820 1111 862 1114" stroke="#88C25D" stroke-width="16" stroke-linecap="round"/>
  `;
}

function orientalGarnish() {
  return `
    <path d="M812 1018L830 1058L874 1064L840 1092L848 1136L812 1114L776 1136L784 1092L750 1064L794 1058L812 1018Z" fill="#F7CA4A"/>
    <circle cx="892" cy="1116" r="32" fill="#C96B29"/>
    <circle cx="926" cy="1078" r="18" fill="#E6A53C"/>
    <path d="M757 1160C789 1125 825 1110 869 1112" stroke="#86B84B" stroke-width="16" stroke-linecap="round"/>
  `;
}

function peanutCaramelGarnish() {
  return `
    <ellipse cx="842" cy="1108" rx="54" ry="38" fill="#C98A44"/>
    <ellipse cx="902" cy="1080" rx="48" ry="34" fill="#B97831"/>
    <path d="M763 1128C807 1084 853 1090 884 1119" stroke="#D5A05B" stroke-width="24" stroke-linecap="round"/>
    <path d="M785 1181C848 1135 906 1136 961 1181" stroke="#F0B55E" stroke-width="26" stroke-linecap="round"/>
  `;
}

function brownieGarnish() {
  return `
    <rect x="774" y="1025" width="136" height="112" rx="24" fill="#5F311F"/>
    <rect x="790" y="1041" width="104" height="80" rx="20" fill="#7A4127"/>
    <path d="M778 1171C821 1126 887 1124 936 1168" stroke="#8B4A2C" stroke-width="30" stroke-linecap="round"/>
    <path d="M792 1070C818 1094 851 1093 876 1069" stroke="#B6825A" stroke-width="10" stroke-linecap="round"/>
  `;
}

function cookieGarnish() {
  return `
    <circle cx="828" cy="1086" r="66" fill="#81533C"/>
    <circle cx="828" cy="1086" r="50" fill="#9D6549"/>
    <circle cx="796" cy="1066" r="10" fill="#3E261A"/>
    <circle cx="844" cy="1048" r="10" fill="#3E261A"/>
    <circle cx="864" cy="1090" r="10" fill="#3E261A"/>
    <circle cx="812" cy="1120" r="8" fill="#3E261A"/>
    <circle cx="900" cy="1128" r="30" fill="#F5F5F0"/>
  `;
}

function lemonGarnish() {
  return `
    <circle cx="834" cy="1096" r="66" fill="#F8D548"/>
    <circle cx="834" cy="1096" r="52" fill="#FFF1A5"/>
    <path d="M834 1044V1148M782 1096H886M796 1058L872 1134M872 1058L796 1134" stroke="#E7C23A" stroke-width="10" stroke-linecap="round"/>
    <rect x="894" y="1107" width="78" height="58" rx="16" fill="#F6D68A"/>
    <rect x="908" y="1120" width="50" height="32" rx="10" fill="#EEC56D"/>
  `;
}

function laysBadge(label) {
  return `
    <g transform="translate(338 352)">
      <ellipse cx="0" cy="0" rx="128" ry="78" fill="#F6CF31"/>
      <path d="M-122 -14C-78 -68 30 -85 114 -47C73 -9 27 20 -49 37C-98 48 -126 36 -122 -14Z" fill="#D9342B"/>
      <text x="-8" y="18" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Arial Black&quot;, &quot;Segoe UI&quot;, sans-serif" font-size="82" font-weight="900">Lay&apos;s</text>
    </g>
    <text x="600" y="392" text-anchor="middle" fill="rgba(255,255,255,0.96)" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="42" font-weight="700" letter-spacing="0.16em">${escapeXml(label)}</text>
  `;
}

function funnyBadge() {
  return `
    <g transform="translate(600 352)">
      <ellipse cx="0" cy="0" rx="168" ry="82" fill="#D73330"/>
      <ellipse cx="0" cy="0" rx="152" ry="66" fill="#EA4C41" opacity="0.4"/>
      <text x="0" y="18" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Arial Black&quot;, &quot;Segoe UI&quot;, sans-serif" font-size="72" font-weight="900">funny-frisch</text>
      <path d="M-126 48C-66 78 60 78 122 48" stroke="#7BC55C" stroke-width="16" stroke-linecap="round"/>
    </g>
    <text x="600" y="430" text-anchor="middle" fill="rgba(255,255,255,0.92)" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="0.22em">CHIPSFRISCH</text>
  `;
}

function bagPackshot({
  bodyTop,
  bodyBottom,
  accent,
  accentSoft,
  panelFill,
  badge,
  titleLines,
  ribbonText,
  garnish,
  titleRaw = false,
  ribbonRaw = false,
}) {
  return svg(`
    <ellipse cx="600" cy="1430" rx="276" ry="72" fill="#07111D" opacity="0.18"/>
    <g filter="url(#shadow)">
      <path d="M266 180C358 112 842 112 934 180L990 1192C994 1278 920 1364 832 1392C752 1416 449 1416 368 1392C280 1364 206 1278 210 1192L266 180Z" fill="url(#bagBody)"/>
      <path d="M284 198C365 140 835 140 916 198L961 1186C964 1254 905 1322 830 1344C748 1368 452 1368 370 1344C295 1322 236 1254 239 1186L284 198Z" fill="rgba(255,255,255,0.14)"/>
      <path d="M290 206C370 150 830 150 910 206L908 278C828 332 372 332 292 278L290 206Z" fill="rgba(255,255,255,0.18)"/>
      <path d="M264 220C370 134 830 134 936 220" stroke="rgba(255,255,255,0.22)" stroke-width="14" stroke-linecap="round"/>
      <path d="M214 1182C324 1286 876 1286 986 1182" stroke="rgba(8,18,32,0.16)" stroke-width="26" stroke-linecap="round"/>
      <path d="M260 182C348 112 852 112 940 182L932 1268C924 1318 876 1362 818 1378C724 1404 476 1404 382 1378C324 1362 276 1318 268 1268L260 182Z" fill="url(#gloss)"/>
      <rect x="298" y="480" width="604" height="454" rx="58" fill="${panelFill}" opacity="0.94"/>
      <rect x="298" y="958" width="604" height="118" rx="36" fill="${accentSoft}" opacity="0.96"/>
      ${badge}
      ${multiline(titleLines, {
        x: 352,
        y: 610,
        size: 82,
        lineHeight: 78,
        fill: "#FFFFFF",
        raw: titleRaw,
      })}
      <text x="600" y="1035" text-anchor="middle" fill="#112035" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="42" font-weight="800" letter-spacing="0.16em">${
        ribbonRaw ? ribbonText : escapeXml(ribbonText)
      }</text>
      ${chip(458, 1088, -16, 0.95)}
      ${chip(572, 1160, 6, 1.02)}
      ${chip(690, 1084, 22, 0.9)}
      ${garnish}
      <rect x="314" y="1120" width="254" height="112" rx="32" fill="${accent}" opacity="0.96"/>
      <text x="441" y="1192" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="44" font-weight="800" letter-spacing="0.12em">FOODRANKER</text>
      <text x="600" y="1298" text-anchor="middle" fill="rgba(255,255,255,0.88)" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="700">Lokales, schnelles Packshot</text>
    </g>
    <defs>
      <linearGradient id="bagBody" x1="262" y1="170" x2="940" y2="1388" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${bodyTop}"/>
        <stop offset="1" stop-color="${bodyBottom}"/>
      </linearGradient>
    </defs>
  `);
}

function pringlesPackshot({ bodyTop, bodyBottom, badgeFill, flavor, flavorNote, garnish }) {
  return svg(`
    <ellipse cx="600" cy="1430" rx="232" ry="70" fill="#07111D" opacity="0.18"/>
    <g filter="url(#shadow)">
      <ellipse cx="600" cy="230" rx="252" ry="62" fill="#E7E9EC"/>
      <rect x="348" y="222" width="504" height="1080" rx="112" fill="url(#canBody)"/>
      <ellipse cx="600" cy="226" rx="252" ry="64" fill="#F8FAFC"/>
      <ellipse cx="600" cy="226" rx="224" ry="44" fill="#D8DDE4"/>
      <ellipse cx="600" cy="1296" rx="252" ry="64" fill="#7B3A16" opacity="0.24"/>
      <path d="M416 284C442 270 758 270 784 284C800 292 805 312 796 324C768 364 432 364 404 324C395 312 400 292 416 284Z" fill="rgba(255,255,255,0.18)"/>
      <circle cx="600" cy="478" r="124" fill="#F8E9A7"/>
      <ellipse cx="562" cy="456" rx="18" ry="14" fill="#0E1725"/>
      <ellipse cx="638" cy="456" rx="18" ry="14" fill="#0E1725"/>
      <path d="M540 520C574 500 626 500 660 520" stroke="#D26531" stroke-width="16" stroke-linecap="round"/>
      <path d="M502 514C532 548 564 554 600 554C636 554 668 548 698 514" stroke="#8B4B22" stroke-width="20" stroke-linecap="round"/>
      <text x="600" y="694" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Arial Black&quot;, &quot;Segoe UI&quot;, sans-serif" font-size="108" font-weight="900">PRINGLES</text>
      <rect x="430" y="758" width="340" height="126" rx="42" fill="${badgeFill}"/>
      <text x="600" y="836" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="48" font-weight="800" letter-spacing="0.14em">${escapeXml(
        flavorNote
      )}</text>
      ${multiline(flavor, { x: 418, y: 980, size: 74, lineHeight: 72, fill: "#FFFFFF" })}
      ${chip(510, 1168, -18, 0.88)}
      ${chip(622, 1218, 3, 0.98)}
      ${chip(728, 1162, 24, 0.86)}
      ${garnish}
      <text x="600" y="1338" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="700">Lokales, schnelles Packshot</text>
    </g>
    <defs>
      <linearGradient id="canBody" x1="348" y1="222" x2="852" y2="1302" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${bodyTop}"/>
        <stop offset="1" stop-color="${bodyBottom}"/>
      </linearGradient>
    </defs>
  `);
}

function barPackshot({
  wrapperTop,
  wrapperBottom,
  panel,
  accent,
  badge,
  titleLines,
  garnish,
  subline,
  titleRaw = false,
}) {
  return svg(`
    <ellipse cx="614" cy="1380" rx="292" ry="74" fill="#07111D" opacity="0.16"/>
    <g filter="url(#shadow)">
      <g transform="rotate(-11 602 736)">
        <rect x="176" y="468" width="852" height="472" rx="82" fill="url(#wrapperBody)"/>
        <path d="M176 612C138 598 122 548 150 516C156 510 164 506 176 504V904C161 900 152 892 146 882C118 850 132 800 176 792V612Z" fill="rgba(255,255,255,0.12)"/>
        <path d="M1028 612C1066 598 1082 548 1054 516C1048 510 1040 506 1028 504V904C1043 900 1052 892 1058 882C1086 850 1072 800 1028 792V612Z" fill="rgba(8,18,32,0.12)"/>
        <rect x="256" y="548" width="548" height="304" rx="58" fill="${panel}" opacity="0.96"/>
        <rect x="256" y="876" width="300" height="76" rx="28" fill="${accent}" opacity="0.96"/>
        <text x="406" y="926" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="0.12em">${escapeXml(
          subline
        )}</text>
        <rect x="258" y="500" width="240" height="74" rx="26" fill="${accent}"/>
        <text x="378" y="548" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="34" font-weight="900" letter-spacing="0.12em">${escapeXml(
          badge
        )}</text>
        ${multiline(titleLines, {
          x: 300,
          y: 650,
          size: 66,
          lineHeight: 62,
          fill: "#FFFFFF",
          raw: titleRaw,
        })}
        <circle cx="876" cy="728" r="100" fill="rgba(255,255,255,0.12)"/>
        <text x="876" y="716" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="70" font-weight="900">20</text>
        <text x="876" y="774" text-anchor="middle" fill="#FFFFFF" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="0.12em">PROTEIN</text>
        <path d="M186 480C248 422 956 422 1018 480" stroke="rgba(255,255,255,0.18)" stroke-width="16" stroke-linecap="round"/>
        <path d="M184 928C258 988 946 988 1020 928" stroke="rgba(8,18,32,0.14)" stroke-width="18" stroke-linecap="round"/>
      </g>
      <g transform="translate(574 1018)">
        <rect x="0" y="0" width="310" height="126" rx="38" fill="#5D3625"/>
        <rect x="18" y="18" width="274" height="90" rx="28" fill="#7B482E"/>
        <rect x="78" y="0" width="70" height="126" rx="20" fill="#EED1AB"/>
        <rect x="162" y="0" width="66" height="126" rx="20" fill="#E9BE79"/>
        <rect x="244" y="0" width="66" height="126" rx="20" fill="#5D3625"/>
      </g>
      ${garnish}
      <text x="600" y="1340" text-anchor="middle" fill="#0E1725" font-family="&quot;Segoe UI&quot;, Arial, sans-serif" font-size="36" font-weight="800">Lokales, schnelles Packshot</text>
    </g>
    <defs>
      <linearGradient id="wrapperBody" x1="176" y1="468" x2="1028" y2="940" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${wrapperTop}"/>
        <stop offset="1" stop-color="${wrapperBottom}"/>
      </linearGradient>
    </defs>
  `);
}

const files = [
  {
    name: "lays-classic-gesalzen.svg",
    markup: bagPackshot({
      bodyTop: "#F7D237",
      bodyBottom: "#DDA41A",
      accent: "#CE2D28",
      accentSoft: "#FFF1C1",
      panelFill: "#D7271F",
      badge: laysBadge("CLASSIC"),
      titleLines: ["Gesalzen"],
      ribbonText: "KNUSPRIG & KLASSISCH",
      garnish: saltCrystals(),
    }),
  },
  {
    name: "lays-classic-red-paprika.svg",
    markup: bagPackshot({
      bodyTop: "#E84230",
      bodyBottom: "#B11B18",
      accent: "#F7D13C",
      accentSoft: "#FFD8A7",
      panelFill: "#F5C230",
      badge: laysBadge("CLASSIC"),
      titleLines: ["Red", "Paprika"],
      ribbonText: "MILD W&#220;RZIG",
      ribbonRaw: true,
      garnish: paprikaGarnish(),
    }),
  },
  {
    name: "lays-classic-sour-cream-onion.svg",
    markup: bagPackshot({
      bodyTop: "#7CC149",
      bodyBottom: "#2C7B3F",
      accent: "#F6D85B",
      accentSoft: "#E8F2D8",
      panelFill: "#104C34",
      badge: laysBadge("CLASSIC"),
      titleLines: ["Sour Cream", "& Onion"],
      ribbonText: "CREMIG & FRISCH",
      garnish: onionGarnish(),
    }),
  },
  {
    name: "funny-frisch-chipsfrisch-ungarisch.svg",
    markup: bagPackshot({
      bodyTop: "#CE352F",
      bodyBottom: "#971A18",
      accent: "#5AAF48",
      accentSoft: "#FFD56F",
      panelFill: "#F2C640",
      badge: funnyBadge(),
      titleLines: ["Ungarisch"],
      ribbonText: "DER KLASSIKER",
      garnish: paprikaGarnish(),
    }),
  },
  {
    name: "funny-frisch-chipsfrisch-oriental.svg",
    markup: bagPackshot({
      bodyTop: "#E37A20",
      bodyBottom: "#B24B12",
      accent: "#8C3A8E",
      accentSoft: "#FFE0A8",
      panelFill: "#7E2F85",
      badge: funnyBadge(),
      titleLines: ["Oriental"],
      ribbonText: "AROMATISCH & WARM",
      garnish: orientalGarnish(),
    }),
  },
  {
    name: "funny-frisch-chipsfrisch-gesalzen.svg",
    markup: bagPackshot({
      bodyTop: "#F7D34B",
      bodyBottom: "#D59D19",
      accent: "#4DAA48",
      accentSoft: "#FFF3BF",
      panelFill: "#D9352F",
      badge: funnyBadge(),
      titleLines: ["Gesalzen"],
      ribbonText: "PURER CHIPSGESCHMACK",
      garnish: saltCrystals(),
    }),
  },
  {
    name: "pringles-original.svg",
    markup: pringlesPackshot({
      bodyTop: "#E3B82E",
      bodyBottom: "#BD7B13",
      badgeFill: "#C7352E",
      flavor: ["Original"],
      flavorNote: "THE ORIGINAL",
      garnish: saltCrystals(),
    }),
  },
  {
    name: "pringles-paprika.svg",
    markup: pringlesPackshot({
      bodyTop: "#D94737",
      bodyBottom: "#A51E1B",
      badgeFill: "#F1B934",
      flavor: ["Paprika"],
      flavorNote: "SPICY & SMOKY",
      garnish: paprikaGarnish(),
    }),
  },
  {
    name: "pringles-sour-cream-onion.svg",
    markup: pringlesPackshot({
      bodyTop: "#73BF4A",
      bodyBottom: "#2B7F41",
      badgeFill: "#F6D35A",
      flavor: ["Sour Cream", "& Onion"],
      flavorNote: "CREAMY",
      garnish: onionGarnish(),
    }),
  },
  {
    name: "aldi-sports-gefuellter-proteinriegel-peanut-caramel.svg",
    markup: barPackshot({
      wrapperTop: "#1A2232",
      wrapperBottom: "#0D1320",
      panel: "#1F5FBF",
      accent: "#D39A37",
      badge: "ALDI SPORTS",
      titleLines: ["Gef&#252;llter", "Proteinriegel", "Peanut-Caramel"],
      garnish: peanutCaramelGarnish(),
      subline: "SOFT FILLED",
      titleRaw: true,
    }),
  },
  {
    name: "aldi-sports-gefuellter-proteinriegel-chocolate-brownie.svg",
    markup: barPackshot({
      wrapperTop: "#1A202A",
      wrapperBottom: "#0D121A",
      panel: "#6A3D28",
      accent: "#B57745",
      badge: "ALDI SPORTS",
      titleLines: ["Gef&#252;llter", "Proteinriegel", "Chocolate-Brownie"],
      garnish: brownieGarnish(),
      subline: "SOFT FILLED",
      titleRaw: true,
    }),
  },
  {
    name: "aldi-sports-high-protein-riegel-vegan-cookies-cream.svg",
    markup: barPackshot({
      wrapperTop: "#1E2432",
      wrapperBottom: "#111622",
      panel: "#1A7C71",
      accent: "#B5C757",
      badge: "ALDI SPORTS",
      titleLines: ["High Protein", "Riegel Vegan", "Cookies & Cream"],
      garnish: cookieGarnish(),
      subline: "VEGAN",
    }),
  },
  {
    name: "aldi-sports-high-protein-riegel-vegan-lemon-cake.svg",
    markup: barPackshot({
      wrapperTop: "#1E2432",
      wrapperBottom: "#111622",
      panel: "#D4A018",
      accent: "#7AAE47",
      badge: "ALDI SPORTS",
      titleLines: ["High Protein", "Riegel Vegan", "Lemon Cake"],
      garnish: lemonGarnish(),
      subline: "VEGAN",
    }),
  },
];

for (const file of files) {
  writeAsset(file.name, file.markup);
}

console.log(`Generated ${files.length} targeted packshots in ${OUTPUT_DIR}`);
