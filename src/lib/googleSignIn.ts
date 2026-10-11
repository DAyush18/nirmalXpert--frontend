import {
    GoogleAuthProvider,
    signInWithCredential,
    signOut,
} from "firebase/auth";
import { NativeModules, TurboModuleRegistry } from "react-native";

import {
    firebaseAuth,
    googleWebClientId,
    isFirebaseConfigured,
} from "@/lib/firebase";
import {
    isGoogleCancelError,
    parseGoogleSignInResult,
} from "@/lib/googleResult";

/**
 * "Continue with Google":
 *   1. native Google sign-in            -> a Google ID token
 *   2. Firebase signInWithCredential    -> a Firebase ID token
 *   3. the caller sends that to POST /auth/google
 *
 * The backend verifies the FIREBASE token (not the raw Google one) and requires the
 * Google provider with a verified email.
 */
export class GoogleNotConfiguredError extends Error {
  constructor(message = "Google sign-in is not set up in this build yet.") {
    super(message);
    this.name = "GoogleNotConfiguredError";
  }
}

const NEEDS_DEV_BUILD =
  "Google sign-in needs a development build. It does not run in Expo Go.";

/** Is the native Google module inside this app binary? (It is not in Expo Go.) */
function hasGoogleNativeModule() {
  try {
    return Boolean(
      TurboModuleRegistry.get("RNGoogleSignin") ?? NativeModules.RNGoogleSignin,
    );
  } catch {
    return false;
  }
}

// Loaded lazily, and only after checking the native module exists. A try/catch around
// require() is NOT enough: Metro swallows a failed lazy require, shows a red error
// screen and returns undefined instead of throwing.
function loadGoogleSignin() {
  if (!hasGoogleNativeModule())
    throw new GoogleNotConfiguredError(NEEDS_DEV_BUILD);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require("@react-native-google-signin/google-signin");

  if (!loaded?.GoogleSignin)
    throw new GoogleNotConfiguredError(NEEDS_DEV_BUILD);
  return loaded;
}

/** Resolves with a Firebase ID token, or null if the user cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    throw new GoogleNotConfiguredError(
      "Google sign-in is not configured. Add the Firebase and Google client IDs to your .env file.",
    );
  }

  const { GoogleSignin } = loadGoogleSignin();
  GoogleSignin.configure({ webClientId: googleWebClientId });

  // Forget the previously used Google account first. Otherwise Google may reuse it
  // silently; this makes the account chooser (all Gmail accounts on the device,
  // plus "Add another account") appear on every "Continue with Google".
  try {
    await GoogleSignin.signOut();
  } catch {
    // nothing was signed in
  }

  let googleIdToken: string;

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const parsed = parseGoogleSignInResult(await GoogleSignin.signIn());

    if (parsed.status === "cancelled") return null;
    if (parsed.status === "missing") {
      throw new Error(
        "Google did not return an ID token. Check that the web client ID in .env is correct.",
      );
    }

    googleIdToken = parsed.idToken;
  } catch (error) {
    if (isGoogleCancelError(error)) return null;

    throw error;
  }

  const auth = firebaseAuth();

  try {
    const result = await signInWithCredential(
      auth,
      GoogleAuthProvider.credential(googleIdToken),
    );
    return await result.user.getIdToken();
  } finally {
    // Firebase only minted this token. Our own session takes over, so clear both
    // sessions (this also makes the next tap show the Google account chooser).
    await signOut(auth).catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
  }
}

/**
 * Forget the Google (and Firebase) account on this device. Called on logout so the
 * next "Continue with Google" shows the account chooser again. Never throws.
 */
export async function clearGoogleSession() {
  try {
    const { GoogleSignin } = loadGoogleSignin();
    await GoogleSignin.signOut();
  } catch {
    // not installed (Expo Go) or nothing to clear
  }

  if (!isFirebaseConfigured()) return;

  try {
    await signOut(firebaseAuth());
  } catch {
    // nothing to clear
  }
}
