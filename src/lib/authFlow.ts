import { isAxiosError } from "axios";
import type { Router } from "expo-router";

import type { AuthResult } from "@/lib/authResult";
import { useAuthStore } from "@/store/auth.store";

/**
 * What happens after OTP verify / Google, in one place:
 *
 *   existing user -> save the session. The root layout's route guards then put
 *                    them in their own area (customer / dealer). No role screen.
 *   new user      -> keep the registration token (memory only) and show role
 *                    selection. No registration form.
 */
export async function completeAuth(result: AuthResult, router: Router) {
  if (result.kind === "session") {
    await useAuthStore.getState().setSession(result.session);
    return;
  }

  useAuthStore.getState().setPendingRegistration(result.registrationToken);
  router.replace("/(auth)/choose-role");
}

/** Readable message from an axios / fetch / generic error. */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
) {
  if (isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      (error.response
        ? `Request failed (${error.response.status}).`
        : "Unable to reach the server. Check your connection and try again.")
    );
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
