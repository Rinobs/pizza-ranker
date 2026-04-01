export const PROFILE_POINT_WEIGHTS = {
  rating: 12,
  comment: 7,
  favorite: 4,
  follower: 9,
} as const;

type ProfileLevel = {
  minPoints: number;
  name: string;
};

export const PROFILE_LEVELS: ProfileLevel[] = [
  { minPoints: 0, name: "Snack Scout" },
  { minPoints: 90, name: "Geschmacksjaeger" },
  { minPoints: 200, name: "Food Kritiker" },
  { minPoints: 360, name: "Crew Captain" },
  { minPoints: 560, name: "Food Legend" },
];

export type ProfilePointSummary = {
  ratingCount: number;
  commentCount: number;
  favoriteCount: number;
  followerCount: number;
};

export type ProfileLevelInfo = {
  currentLevelName: string;
  currentLevelMinPoints: number;
  nextLevelName: string | null;
  nextLevelMinPoints: number | null;
  pointsToNextLevel: number;
};

export type TasteComparisonItem = {
  productSlug: string;
  viewerRating: number;
  candidateRating: number;
  difference: number;
  averageRating: number;
};

export type TasteComparisonSummary = {
  overlapCount: number;
  averageDifference: number;
  matchScore: number;
  overlaps: TasteComparisonItem[];
  strongestAgreements: TasteComparisonItem[];
  strongestDisagreements: TasteComparisonItem[];
};

export function calculateProfilePoints(summary: ProfilePointSummary) {
  return (
    summary.ratingCount * PROFILE_POINT_WEIGHTS.rating +
    summary.commentCount * PROFILE_POINT_WEIGHTS.comment +
    summary.favoriteCount * PROFILE_POINT_WEIGHTS.favorite +
    summary.followerCount * PROFILE_POINT_WEIGHTS.follower
  );
}

export function getProfileLevelInfo(points: number): ProfileLevelInfo {
  let currentLevel = PROFILE_LEVELS[0];
  let nextLevel: ProfileLevel | null = null;

  for (let index = 0; index < PROFILE_LEVELS.length; index += 1) {
    const level = PROFILE_LEVELS[index];
    const followingLevel = PROFILE_LEVELS[index + 1] ?? null;

    if (points >= level.minPoints) {
      currentLevel = level;
      nextLevel = followingLevel;
    }
  }

  return {
    currentLevelName: currentLevel.name,
    currentLevelMinPoints: currentLevel.minPoints,
    nextLevelName: nextLevel?.name ?? null,
    nextLevelMinPoints: nextLevel?.minPoints ?? null,
    pointsToNextLevel: nextLevel ? Math.max(0, nextLevel.minPoints - points) : 0,
  };
}

export function buildTasteMatch(
  viewerRatings: Map<string, number>,
  candidateRatings: Map<string, number>
) {
  const comparison = buildTasteComparison(viewerRatings, candidateRatings);

  if (!comparison) {
    return null;
  }

  return {
    overlapCount: comparison.overlapCount,
    averageDifference: comparison.averageDifference,
    matchScore: comparison.matchScore,
  };
}

export function buildTasteComparison(
  viewerRatings: Map<string, number>,
  candidateRatings: Map<string, number>,
  options?: {
    agreementLimit?: number;
    disagreementLimit?: number;
  }
) {
  const overlaps: TasteComparisonItem[] = [];

  for (const [productSlug, viewerRating] of viewerRatings.entries()) {
    const candidateRating = candidateRatings.get(productSlug);

    if (candidateRating === undefined) {
      continue;
    }

    const difference = Math.abs(viewerRating - candidateRating);
    overlaps.push({
      productSlug,
      viewerRating,
      candidateRating,
      difference,
      averageRating: (viewerRating + candidateRating) / 2,
    });
  }

  if (overlaps.length === 0) {
    return null;
  }

  const averageDifference =
    overlaps.reduce((sum, item) => sum + item.difference, 0) / overlaps.length;
  const closenessScore = Math.max(
    0,
    100 - Math.round((averageDifference / 4) * 100)
  );
  const overlapBonus = Math.min(15, overlaps.length * 3);
  const strongestAgreements = [...overlaps]
    .sort((left, right) => {
      if (left.difference !== right.difference) {
        return left.difference - right.difference;
      }
      if (left.averageRating !== right.averageRating) {
        return right.averageRating - left.averageRating;
      }
      return left.productSlug.localeCompare(right.productSlug, "de");
    })
    .slice(0, options?.agreementLimit ?? 4);
  const strongestDisagreements = [...overlaps]
    .filter((item) => item.difference >= 1)
    .sort((left, right) => {
      if (left.difference !== right.difference) {
        return right.difference - left.difference;
      }
      if (left.averageRating !== right.averageRating) {
        return right.averageRating - left.averageRating;
      }
      return left.productSlug.localeCompare(right.productSlug, "de");
    })
    .slice(0, options?.disagreementLimit ?? 4);

  return {
    overlapCount: overlaps.length,
    averageDifference,
    matchScore: Math.min(100, closenessScore + overlapBonus),
    overlaps,
    strongestAgreements,
    strongestDisagreements,
  } satisfies TasteComparisonSummary;
}
