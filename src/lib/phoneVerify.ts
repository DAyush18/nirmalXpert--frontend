/** Pure helpers for the "verify your mobile number" field (no React). */

export const OTP_LENGTH = 6;

/** Keep digits only, at most 6 (also handles an SMS autofill or a paste). */
export function sanitizeOtp(text: string) {
  return text.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

/** 57 -> "00:57" */
export function formatCountdown(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The backend allows one code per 60 s and answers
 * "Please wait 23 seconds before requesting another code". That means a code was
 * ALREADY sent and is still valid, so the flow should continue, not fail.
 * Returns the seconds to wait, or null if the message is something else.
 */
export function parseCooldownSeconds(message: string): number | null {
  const match = /^please wait (\d+) seconds?/i.exec(message.trim());
  return match ? Number(match[1]) : null;
}
