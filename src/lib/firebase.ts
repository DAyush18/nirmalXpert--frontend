import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebase is used for ONE thing: turning a Google sign-in into a Firebase ID
 * token, which is what POST /auth/google verifies (firebase-admin on the backend).
 * The app's real session is the backend's own access + refresh token, so no
 * Firebase session is kept.
 *
 * Values come from .env (EXPO_PUBLIC_* are inlined at build time). The Firebase
 * web config is not a secret.
 */
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export function isFirebaseConfigured() {
  return Boolean(
    config.apiKey && config.projectId && config.appId && googleWebClientId,
  );
}

export function firebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}
