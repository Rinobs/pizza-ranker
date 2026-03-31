export const REVIEW_USER_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ReviewLikeRow = {
  user_id: string;
  review_user_id: string;
  product_slug: string;
  inserted_at: string | null;
  updated_at: string | null;
};

export type ReviewLikeState = {
  reviewUserId: string;
  productSlug: string;
  likeCount: number;
  viewerLiked: boolean;
};

export function isValidReviewUserId(value: string) {
  return REVIEW_USER_ID_PATTERN.test(value);
}

export function buildReviewLikeKey(reviewUserId: string, productSlug: string) {
  return `${reviewUserId}:${productSlug}`;
}

export function isReviewLikesSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("review_likes") &&
    (normalized.includes("relation") ||
      normalized.includes("table") ||
      normalized.includes("column") ||
      normalized.includes("schema cache"))
  );
}

export function buildReviewLikeStateMap(
  rows: ReviewLikeRow[],
  viewerUserId: string | null
) {
  const map = new Map<string, { likeCount: number; viewerLiked: boolean }>();

  for (const row of rows) {
    const key = buildReviewLikeKey(row.review_user_id, row.product_slug);
    const current = map.get(key) ?? {
      likeCount: 0,
      viewerLiked: false,
    };

    map.set(key, {
      likeCount: current.likeCount + 1,
      viewerLiked:
        current.viewerLiked || (viewerUserId !== null && row.user_id === viewerUserId),
    });
  }

  return map;
}
