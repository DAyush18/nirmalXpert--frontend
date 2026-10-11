/**
 * Decode a JWT payload WITHOUT verifying it. Only for dev diagnostics (reading the
 * claims of a token we just received). Never trust a token because of this.
 * Pure: no atob / Buffer, so it runs the same on Hermes and in tests.
 */
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlToBytes(input: string): number[] {
  const clean = input.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of clean) {
    const value = B64.indexOf(char);
    if (value < 0) throw new Error("invalid base64");

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return bytes;
}

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;

    // bytes -> UTF-8 text (names can contain non-ASCII characters)
    const text = decodeURIComponent(
      base64UrlToBytes(part)
        .map((byte) => `%${byte.toString(16).padStart(2, "0")}`)
        .join(""),
    );

    const payload: unknown = JSON.parse(text);
    return typeof payload === "object" &&
      payload !== null &&
      !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
