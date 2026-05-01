type CategoryAccent = {
  badgeClass: string;
  subtleBadgeClass: string;
  cardClass: string;
  accentBarClass: string;
  navCardClass: string;
  navTitleClass: string;
  iconWrapClass: string;
  thumbClass: string;
  shimmerClass: string;
};

const DEFAULT_ACCENT: CategoryAccent = {
  badgeClass: "border-white/12 bg-[#0D1420]/88 text-[#DCE9F5]",
  subtleBadgeClass: "border-[#2D3A4B] bg-[#101822] text-[#D6E2EF]",
  cardClass: "hover:border-[#5EE287] hover:shadow-[0_20px_44px_rgba(34,197,94,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#5EE287,#9AF7B7)]",
  navCardClass: "border-[#2A394B] bg-[#101822] hover:border-[#5EE287]/35",
  navTitleClass: "group-hover:text-[#8AF5AC]",
  iconWrapClass: "border-[#35503D] bg-[radial-gradient(circle_at_top,rgba(94,226,135,0.18),rgba(15,22,33,0.96)_72%)] text-[#D9FFE6]",
  thumbClass: "border-[#35503D]/35",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(94,226,135,0.12),#131B26_60%)]",
};

const PIZZA_ACCENT: CategoryAccent = {
  badgeClass: "border-[#7A4520]/70 bg-[#2B1A12]/88 text-[#FFD2BC]",
  subtleBadgeClass: "border-[#6A3F21] bg-[#21150F] text-[#F6BA98]",
  cardClass: "hover:border-[#FF9A55] hover:shadow-[0_20px_44px_rgba(255,154,85,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#FF9350,#FFD38C)]",
  navCardClass: "border-[#5B3824] bg-[linear-gradient(135deg,rgba(48,26,17,0.9),rgba(16,24,34,0.96))] hover:border-[#FF9A55]/40",
  navTitleClass: "group-hover:text-[#FFD3BD]",
  iconWrapClass: "border-[#6A4127] bg-[radial-gradient(circle_at_top,rgba(255,154,85,0.24),rgba(20,25,35,0.96)_72%)] text-[#FFD8C2]",
  thumbClass: "border-[#6A4127]/50",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,147,80,0.14),#131B26_60%)]",
};

const CHIPS_ACCENT: CategoryAccent = {
  badgeClass: "border-[#75611E]/70 bg-[#2B2410]/88 text-[#FFE7A3]",
  subtleBadgeClass: "border-[#67561C] bg-[#221D0E] text-[#F4D57A]",
  cardClass: "hover:border-[#E8C45E] hover:shadow-[0_20px_44px_rgba(232,196,94,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#D8A340,#FFE08A)]",
  navCardClass: "border-[#5A4821] bg-[linear-gradient(135deg,rgba(45,34,14,0.92),rgba(16,24,34,0.96))] hover:border-[#E8C45E]/40",
  navTitleClass: "group-hover:text-[#FFE3A1]",
  iconWrapClass: "border-[#6A5423] bg-[radial-gradient(circle_at_top,rgba(232,196,94,0.22),rgba(20,25,35,0.96)_72%)] text-[#FFE9AF]",
  thumbClass: "border-[#6A5423]/50",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,163,64,0.14),#131B26_60%)]",
};

const ICE_ACCENT: CategoryAccent = {
  badgeClass: "border-[#7D3E67]/70 bg-[#281420]/88 text-[#FFD5EA]",
  subtleBadgeClass: "border-[#6C3658] bg-[#21111B] text-[#F0AFCF]",
  cardClass: "hover:border-[#F48DC4] hover:shadow-[0_20px_44px_rgba(244,141,196,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#FF8DC1,#FFD5EA)]",
  navCardClass: "border-[#5D314C] bg-[linear-gradient(135deg,rgba(45,20,35,0.92),rgba(16,24,34,0.96))] hover:border-[#F48DC4]/40",
  navTitleClass: "group-hover:text-[#FFD7EC]",
  iconWrapClass: "border-[#6B3756] bg-[radial-gradient(circle_at_top,rgba(244,141,196,0.22),rgba(20,25,35,0.96)_72%)] text-[#FFDDF0]",
  thumbClass: "border-[#6B3756]/50",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,141,193,0.13),#131B26_60%)]",
};

const PROTEIN_POWDER_ACCENT: CategoryAccent = {
  badgeClass: "border-[#236172]/70 bg-[#102028]/88 text-[#C7F4FF]",
  subtleBadgeClass: "border-[#245364] bg-[#0F1B23] text-[#97DEEF]",
  cardClass: "hover:border-[#68D7F4] hover:shadow-[0_20px_44px_rgba(104,215,244,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#56C6E8,#A9F2FF)]",
  navCardClass: "border-[#204956] bg-[linear-gradient(135deg,rgba(14,32,40,0.92),rgba(16,24,34,0.96))] hover:border-[#68D7F4]/40",
  navTitleClass: "group-hover:text-[#CFF6FF]",
  iconWrapClass: "border-[#285866] bg-[radial-gradient(circle_at_top,rgba(104,215,244,0.22),rgba(20,25,35,0.96)_72%)] text-[#D4F7FF]",
  thumbClass: "border-[#285866]/50",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(86,198,232,0.13),#131B26_60%)]",
};

const PROTEIN_BAR_ACCENT: CategoryAccent = {
  badgeClass: "border-[#295581]/70 bg-[#122033]/88 text-[#D8E8FF]",
  subtleBadgeClass: "border-[#2A4C70] bg-[#111C2B] text-[#A7CAFF]",
  cardClass: "hover:border-[#6AA8FF] hover:shadow-[0_20px_44px_rgba(106,168,255,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#5D9BFF,#9DCCFF)]",
  navCardClass: "border-[#274766] bg-[linear-gradient(135deg,rgba(16,28,45,0.92),rgba(16,24,34,0.96))] hover:border-[#6AA8FF]/40",
  navTitleClass: "group-hover:text-[#DCEBFF]",
  iconWrapClass: "border-[#305677] bg-[radial-gradient(circle_at_top,rgba(106,168,255,0.22),rgba(20,25,35,0.96)_72%)] text-[#E0EEFF]",
  thumbClass: "border-[#305677]/50",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(93,155,255,0.13),#131B26_60%)]",
};

const PROTEIN_SNACKS_ACCENT: CategoryAccent = {
  badgeClass: "border-[#5D427D]/70 bg-[#1F1728]/88 text-[#E7D7FF]",
  subtleBadgeClass: "border-[#513A6C] bg-[#1A1421] text-[#C6A9F1]",
  cardClass: "hover:border-[#B58BFF] hover:shadow-[0_20px_44px_rgba(181,139,255,0.18)]",
  accentBarClass: "bg-[linear-gradient(90deg,#9E75F1,#D8C1FF)]",
  navCardClass: "border-[#47335F] bg-[linear-gradient(135deg,rgba(29,20,39,0.92),rgba(16,24,34,0.96))] hover:border-[#B58BFF]/40",
  navTitleClass: "group-hover:text-[#E9DFFF]",
  iconWrapClass: "border-[#553B70] bg-[radial-gradient(circle_at_top,rgba(181,139,255,0.22),rgba(20,25,35,0.96)_72%)] text-[#ECE2FF]",
  thumbClass: "border-[#553B70]/50",
  shimmerClass: "bg-[radial-gradient(ellipse_at_50%_0%,rgba(158,117,241,0.13),#131B26_60%)]",
};

function normalizeCategory(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getCategoryAccent(category: string | null | undefined): CategoryAccent {
  const normalized = normalizeCategory(category);

  if (normalized.includes("proteinriegel")) {
    return PROTEIN_BAR_ACCENT;
  }

  if (normalized.includes("proteinpulver")) {
    return PROTEIN_POWDER_ACCENT;
  }

  if (normalized.includes("proteinsnack")) {
    return PROTEIN_SNACKS_ACCENT;
  }

  if (normalized.includes("pizza")) {
    return PIZZA_ACCENT;
  }

  if (normalized.includes("chips")) {
    return CHIPS_ACCENT;
  }

  if (normalized.includes("eis")) {
    return ICE_ACCENT;
  }

  return DEFAULT_ACCENT;
}
