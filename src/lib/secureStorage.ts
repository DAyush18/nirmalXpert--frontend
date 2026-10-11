import * as SecureStore from "expo-secure-store";

const REFRESH_KEY = "refresh_token";

// Only the refresh token is persisted. The access token lives in memory (zustand).
export const tokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_KEY, token),
  clear: () => SecureStore.deleteItemAsync(REFRESH_KEY),
};
