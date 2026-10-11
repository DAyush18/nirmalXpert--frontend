import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_URL, AUTH_ENDPOINTS } from "../constants/config";
import { toSession } from "../lib/authResult";
import { tokenStorage } from "../lib/secureStorage";
import { useAuthStore } from "../store/auth.store";

export const api = axios.create({ baseURL: API_URL, timeout: 15000 });

// ---- Attach access token ----------------------------------------------------
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---- Refresh logic (single-flight) -------------------------------------------
// If several requests fail with 401 at once, only ONE refresh call is made.
let refreshPromise: Promise<string> | null = null;

export function refreshSession(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      // Plain axios (not `api`) so this call can't trigger the interceptor again.
      const { data } = await axios.post(`${API_URL}${AUTH_ENDPOINTS.refresh}`, {
        refreshToken,
      });

      const session = toSession(data);
      if (!session) throw new Error("Invalid refresh response");

      await useAuthStore.getState().setSession(session);

      return session.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const isRefreshCall = original?.url?.includes(AUTH_ENDPOINTS.refresh);

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isRefreshCall
    ) {
      original._retry = true;
      try {
        const newToken = await refreshSession();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        await useAuthStore.getState().logout(); // refresh failed -> back to Welcome
      }
    }
    return Promise.reject(error);
  },
);
