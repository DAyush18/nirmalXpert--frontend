export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const AUTH_ENDPOINTS = {
  refresh: "/auth/refresh",
  logout: "/auth/logout",
} as const;
