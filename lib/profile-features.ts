export const PROFILE_BIO_MAX_LENGTH = 180;
export const PROFILE_AVATAR_MAX_CHARS = 450000;
export const PROFILE_AVATAR_MAX_FILE_BYTES = 4 * 1024 * 1024;

export type ProfileCompletionItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
};

export type ProfileCompletionState = {
  percent: number;
  completedCount: number;
  totalCount: number;
  items: ProfileCompletionItem[];
};

export type ProfileBadgeTone = "mint" | "sky" | "amber" | "rose";

export type ProfileBadge = {
  id: string;
  label: string;
  description: string;
  progressLabel: string;
  unlocked: boolean;
  tone: ProfileBadgeTone;
};

export type ProfileCompletionInput = {
  hasUsername: boolean;
  bio: string | null;
  avatarUrl: string | null;
  ratingCount: number;
  commentCount: number;
  favoriteCount: number;
  followingCount: number;
};

export type ProfileBadgeInput = {
  points: number;
  ratingCount: number;
  commentCount: number;
  favoriteCount: number;
  wantToTryCount: number;
  followerCount: number;
  followingCount: number;
  completionPercent: number;
  averageRating: number | null;
  isLeagueLeader: boolean;
};

const AVATAR_DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i;

export function normalizeProfileBio(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, PROFILE_BIO_MAX_LENGTH);
}

export function normalizeProfileAvatarUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > PROFILE_AVATAR_MAX_CHARS) {
    return null;
  }

  if (!AVATAR_DATA_URL_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
}

export function getProfileInitials(name: string) {
  const cleaned = name.trim();

  if (!cleaned) {
    return "FR";
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || cleaned.slice(0, 2).toUpperCase();
}

export function buildProfileCompletion(input: ProfileCompletionInput): ProfileCompletionState {
  const items: ProfileCompletionItem[] = [
    {
      id: "username",
      label: "Username gesetzt",
      description: "Ein fester Username macht dein Profil auffindbar.",
      completed: input.hasUsername,
    },
    {
      id: "avatar",
      label: "Profilbild hochgeladen",
      description: "Ein Bild macht dein Profil persönlicher.",
      completed: Boolean(input.avatarUrl),
    },
    {
      id: "bio",
      label: "Bio hinzugefügt",
      description: "Erzähle kurz, worauf du beim Snacken achtest.",
      completed: Boolean(input.bio),
    },
    {
      id: "ratings",
      label: "3 Produkte bewertet",
      description: "Ein paar Bewertungen füllen deine Statistik sofort.",
      completed: input.ratingCount >= 3,
    },
    {
      id: "comments",
      label: "2 Kommentare geschrieben",
      description: "Kommentare helfen deinen Freunden bei echten Entscheidungen.",
      completed: input.commentCount >= 2,
    },
    {
      id: "favorites",
      label: "1 Favorit gespeichert",
      description: "Mit Favoriten wirkt dein Geschmack direkt greifbar.",
      completed: input.favoriteCount >= 1,
    },
    {
      id: "following",
      label: "1 Profil gefolgt",
      description: "Social Features werden spannender, sobald du Leuten folgst.",
      completed: input.followingCount >= 1,
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;

  return {
    percent: Math.round((completedCount / totalCount) * 100),
    completedCount,
    totalCount,
    items,
  };
}

export function buildProfileBadges(input: ProfileBadgeInput): ProfileBadge[] {
  const collectionCount = input.favoriteCount + input.wantToTryCount;
  const socialCount = input.followerCount + input.followingCount;

  return [
    {
      id: "taster",
      label: "Taste Scout",
      description: "Für fleißiges Bewerten und schnelles Geschmacksgespür.",
      progressLabel:
        input.ratingCount >= 12 ? `${input.ratingCount} Bewertungen` : `${input.ratingCount}/12 Bewertungen`,
      unlocked: input.ratingCount >= 12,
      tone: "mint",
    },
    {
      id: "critic",
      label: "Review Chef",
      description: "Kommentare geben deinen Empfehlungen echten Mehrwert.",
      progressLabel:
        input.commentCount >= 5 ? `${input.commentCount} Kommentare` : `${input.commentCount}/5 Kommentare`,
      unlocked: input.commentCount >= 5,
      tone: "amber",
    },
    {
      id: "collector",
      label: "Shelf Curator",
      description: "Favoriten und Wunschliste zeigen deinen Style als Sammler.",
      progressLabel:
        collectionCount >= 8 ? `${collectionCount} Listenplätze` : `${collectionCount}/8 Listenplätze`,
      unlocked: collectionCount >= 8,
      tone: "sky",
    },
    {
      id: "social",
      label: "Crew Connector",
      description: "Wer Food-Friends sammelt, baut seine eigene Liga auf.",
      progressLabel:
        socialCount >= 4 ? `${socialCount} Social Verbindungen` : `${socialCount}/4 Social Verbindungen`,
      unlocked: socialCount >= 4,
      tone: "rose",
    },
    {
      id: "polished",
      label: "Profile Glow",
      description: "Ein rundes Profil wirkt direkt lebendig und vertrauenswürdig.",
      progressLabel: `${input.completionPercent}% Profil komplett`,
      unlocked: input.completionPercent === 100,
      tone: "mint",
    },
    {
      id: "legend",
      label: "League Spark",
      description: "Führe deine Freundesliga an oder sammle viele Punkte.",
      progressLabel:
        input.isLeagueLeader || input.points >= 360
          ? `${input.points} Punkte`
          : `${input.points}/360 Punkte`,
      unlocked: input.isLeagueLeader || input.points >= 360,
      tone: "amber",
    },
    {
      id: "quality",
      label: "Gold Palate",
      description: "Konstant hohe Scores zeigen einen klaren Geschmack.",
      progressLabel:
        input.averageRating !== null
          ? `${input.averageRating.toFixed(1)} Durchschnitt`
          : "Noch kein Durchschnitt",
      unlocked: input.averageRating !== null && input.averageRating >= 4 && input.ratingCount >= 5,
      tone: "sky",
    },
  ];
}


