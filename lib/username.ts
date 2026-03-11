export const MIN_USERNAME_LENGTH = 2;
export const MAX_USERNAME_LENGTH = 40;

export function normalizeUsername(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length < MIN_USERNAME_LENGTH || trimmed.length > MAX_USERNAME_LENGTH) {
    return null;
  }

  return trimmed;
}

export function hasStoredUsername(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length >= MIN_USERNAME_LENGTH;
}
