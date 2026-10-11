/**
 * Pure helpers for the native Google sign-in result (no React, no native modules).
 *
 * The result shape differs between @react-native-google-signin versions:
 *   v13+  { type: "success", data: { idToken, user } }  |  { type: "cancelled", data: null }
 *   older { idToken, user }   (and cancelling THROWS an error with a code)
 * so both are handled here instead of trusting one version.
 */

export type GoogleSignInParsed =
  | { status: "success"; idToken: string }
  | { status: "cancelled" }
  | { status: "missing" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseGoogleSignInResult(result: unknown): GoogleSignInParsed {
  if (!isRecord(result)) return { status: "missing" };

  if (result.type === "cancelled") return { status: "cancelled" };

  const data = isRecord(result.data) ? result.data : result;
  const idToken = data.idToken;

  return typeof idToken === "string" && idToken.length > 0
    ? { status: "success", idToken }
    : { status: "missing" };
}

// statusCodes.SIGN_IN_CANCELLED is a different string per platform / version
const CANCEL_CODES = ["SIGN_IN_CANCELLED", "12501", "-5"];

/** True when the user simply closed the Google chooser (not an error to show). */
export function isGoogleCancelError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return CANCEL_CODES.includes(String(error.code ?? ""));
}
