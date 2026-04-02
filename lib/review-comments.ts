export const MIN_COMMENT_LENGTH = 10;
export const MAX_COMMENT_LENGTH = 1000;

export function normalizeReviewComment(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, MAX_COMMENT_LENGTH);
}

export function getReviewCommentValidationError(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length < MIN_COMMENT_LENGTH) {
    return `Kommentare brauchen mindestens ${MIN_COMMENT_LENGTH} Zeichen.`;
  }

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return `Kommentare dürfen höchstens ${MAX_COMMENT_LENGTH} Zeichen lang sein.`;
  }

  return null;
}
