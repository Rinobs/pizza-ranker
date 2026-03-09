import { createHash } from "crypto";

function hexToUuid(hex: string) {
  const normalized = hex.slice(0, 32).padEnd(32, "0").toLowerCase().split("");

  normalized[12] = "4";
  const variant = parseInt(normalized[16], 16);
  normalized[16] = ((variant & 0x3) | 0x8).toString(16);

  const value = normalized.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

export function getStableUserId(email: string) {
  const digest = createHash("sha256")
    .update(email.trim().toLowerCase(), "utf8")
    .digest("hex");

  return hexToUuid(digest);
}
