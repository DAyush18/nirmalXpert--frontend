/**
 * The ONE place that understands the backend's auth responses.
 * Pure (no React / axios / store) so it is easy to test.
 *
 * Backend shapes (auth.service.ts):
 *   session   { token, expiresIn, refreshToken, user, dealer? }      (`token` = access token)
 *   existing  { isNewUser: false, ...session }
 *   new user  { isNewUser: true, registrationToken, expiresInSeconds }
 */
import type { User } from "@/types/auth";

export type Session = {
  accessToken: string;
  refreshToken: string | null;
  user: User;
};

export type AuthResult =
  | { kind: "session"; session: Session }
  | { kind: "register"; registrationToken: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Handles both { token, user, ... } and { success, data: { token, user, ... } }
function unwrap(raw: unknown): unknown {
  if (isRecord(raw) && !raw.user && isRecord(raw.data)) return raw.data;
  return raw;
}

/** Normalized session, or null when the response is not a complete session. */
export function toSession(raw: unknown): Session | null {
  const data = unwrap(raw);
  if (!isRecord(data) || !isRecord(data.user)) return null;

  // Backend sends `token`; accept `accessToken` too. Nothing else maps this.
  const accessToken =
    typeof data.accessToken === "string"
      ? data.accessToken
      : typeof data.token === "string"
        ? data.token
        : null;

  const role = String(data.user.role ?? "").toUpperCase();

  if (
    !accessToken ||
    typeof data.user.id !== "string" ||
    (role !== "DEALER" && role !== "CUSTOMER")
  ) {
    return null;
  }

  return {
    accessToken,
    refreshToken: typeof data.refreshToken === "string" ? data.refreshToken : null,
    user: { ...data.user, role } as unknown as User,
  };
}

/** OTP verify / Google: either a signed-in session or a token to register with. */
export function toAuthResult(raw: unknown): AuthResult {
  const data = unwrap(raw);
  const markedNew = isRecord(data) && data.isNewUser === true;

  if (!markedNew) {
    const session = toSession(data);
    if (session) return { kind: "session", session };
  }

  if (isRecord(data) && typeof data.registrationToken === "string" && data.registrationToken) {
    return { kind: "register", registrationToken: data.registrationToken };
  }

  throw new Error("Unexpected response from the server. Please try again.");
}
