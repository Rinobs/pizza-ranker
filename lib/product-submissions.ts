const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function isProductSubmissionsSchemaMissingError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("product_submissions") &&
    (normalized.includes("relation") ||
      normalized.includes("table") ||
      normalized.includes("column") ||
      normalized.includes("schema cache"))
  );
}

export function normalizeProductSubmissionText(
  value: unknown,
  maxLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export function normalizeProductSubmissionUrl(value: unknown) {
  const normalized = normalizeProductSubmissionText(value, 500);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeProductSubmissionEmail(value: unknown) {
  const normalized = normalizeProductSubmissionText(value, 160).toLowerCase();
  if (!normalized) {
    return "";
  }

  return EMAIL_PATTERN.test(normalized) ? normalized : "";
}

export function normalizeProductSubmissionBarcode(value: unknown) {
  const normalized = normalizeProductSubmissionText(value, 64).replace(/[^\d]/g, "");
  return normalized || "";
}
