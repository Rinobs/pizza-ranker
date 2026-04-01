export const REVIEW_REPLY_ID_PATTERN = /^[1-9]\d*$/;

export type ReviewReplyRow = {
  id: number;
  user_id: string;
  review_user_id: string;
  product_slug: string;
  text: string | null;
  inserted_at: string | null;
  updated_at: string | null;
};

export function isValidReviewReplyId(value: string) {
  return REVIEW_REPLY_ID_PATTERN.test(value);
}

export function isReviewRepliesSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("review_replies") &&
    (normalized.includes("relation") ||
      normalized.includes("table") ||
      normalized.includes("column") ||
      normalized.includes("schema cache"))
  );
}
