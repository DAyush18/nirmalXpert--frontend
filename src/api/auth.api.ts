import { API_URL } from "@/constants/config";
import { toAuthResult, toSession, type AuthResult, type Session } from "@/lib/authResult";
import type { UserRole } from "@/types/auth";
import { api } from "./client";

export type { AuthResult, Session };

export const authApi = {
  sendOtp: async (phone: string) => {
    const response = await fetch(`${API_URL}/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to send OTP");
    }

    return data;
  },

  // Existing number -> a session. New number -> a registrationToken.
  verifyOtp: async (phone: string, code: string): Promise<AuthResult> => {
    const response = await fetch(`${API_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "OTP verification failed");
    }

    return toAuthResult(data);
  },

  // Existing Google account -> a session. New one -> a registrationToken.
  loginWithGoogle: async (idToken: string): Promise<AuthResult> => {
    const response = await api.post("/auth/google", { idToken });
    return toAuthResult(response.data);
  },

  // New identities only. Not a screen: runs right after the role is chosen.
  // Safe to retry: the server signs in to the account if it already exists.
  register: async (
    registrationToken: string,
    role: UserRole,
  ): Promise<Session> => {
    const response = await api.post("/auth/register", { registrationToken, role });
    const session = toSession(response.data);

    if (!session) {
      throw new Error(
        "Your account was created, but the server did not return a valid session. Please sign in again.",
      );
    }

    return session;
  },

  // Add a verified mobile number to the SIGNED-IN account (e.g. one created with Google).
  // POST /auth/phone/send -> 409 if the number belongs to another account
  sendPhoneOtp: async (phone: string) => {
    const response = await api.post("/auth/phone/send", { phone });
    return response.data as { resendAfterSeconds?: number };
  },

  // POST /auth/phone/verify -> saves the number on the account
  verifyPhone: async (phone: string, code: string) => {
    const response = await api.post("/auth/phone/verify", { phone, code });
    return response.data as { phone?: string };
  },

  // Customer onboarding (and any profile edit): PATCH /auth/profile
  updateProfile: async (data: { name?: string; email?: string }) => {
    const response = await api.patch("/auth/profile", data);
    return response.data as {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  },
};
