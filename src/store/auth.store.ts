import { isAxiosError } from "axios";
import { create } from "zustand";
import { tokenStorage } from "../lib/secureStorage";
import type { AuthResponse, User } from "../types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;

  /**
   * New user who verified their phone / Google account but has not chosen a role
   * yet. Held in memory only, and only until the account is created.
   */
  pendingRegistrationToken: string | null;

  setSession: (data: AuthResponse) => Promise<void>;
  setPendingRegistration: (token: string) => void;
  clearPendingRegistration: () => void;
  updateUser: (patch: Partial<User>) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  accessToken: null,
  pendingRegistrationToken: null,

  setSession: async ({ accessToken, refreshToken, user }) => {
    if (refreshToken) {
      await tokenStorage.setRefreshToken(refreshToken);
    } else {
      await tokenStorage.clear(); // drop any stale token from a previous account
    }
    // The account exists now: the temporary registration token is spent.
    set({
      accessToken,
      user,
      status: "authenticated",
      pendingRegistrationToken: null,
    });
  },

  setPendingRegistration: (token) => set({ pendingRegistrationToken: token }),

  clearPendingRegistration: () => set({ pendingRegistrationToken: null }),

  updateUser: (patch) =>
    set((state) => (state.user ? { user: { ...state.user, ...patch } } : state)),

  // Called once on app start: if a refresh token exists, try to restore the session.
  hydrate: async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (!refreshToken) return set({ status: "unauthenticated" });

    try {
      // Imported lazily to avoid a circular import with api/client.ts
      const { refreshSession } = await import("../api/client");
      await refreshSession();
    } catch (error) {
      // Only discard the stored token when the server actually rejected it.
      // Being offline / timing out / a 5xx at launch must not wipe a valid session.
      const rejected =
        isAxiosError(error) &&
        [400, 401, 403].includes(error.response?.status ?? 0);

      if (rejected) await tokenStorage.clear();
      set({ status: "unauthenticated", user: null, accessToken: null });
    }
  },

  logout: async () => {
    await tokenStorage.clear();
    set({
      status: "unauthenticated",
      user: null,
      accessToken: null,
      pendingRegistrationToken: null,
    });

    // Also forget the Google account, so signing in again shows the account chooser.
    // Best effort and off the critical path: logging out must never wait on or fail
    // because of Google. (Lazy import keeps Firebase out of the app's startup.)
    void import("../lib/googleSignIn")
      .then((google) => google.clearGoogleSession())
      .catch(() => undefined);
  },
}));
