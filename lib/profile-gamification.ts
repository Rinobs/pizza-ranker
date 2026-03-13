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
  let overlapCount = 0;
  let totalDifference = 0;

  for (const [productSlug, viewerRating] of viewerRatings.entries()) {
    const candidateRating = candidateRatings.get(productSlug);

    if (candidateRating === undefined) {
      continue;
    }

    overlapCount += 1;
    totalDifference += Math.abs(viewerRating - candidateRating);
  }

  if (overlapCount === 0) {
    return null;
  }

  const averageDifference = totalDifference / overlapCount;
  const closenessScore = Math.max(0, 100 - Math.round((averageDifference / 4) * 100));
  const overlapBonus = Math.min(15, overlapCount * 3);

  return {
    overlapCount,
    averageDifference,
    matchScore: Math.min(100, closenessScore + overlapBonus),
  };
}