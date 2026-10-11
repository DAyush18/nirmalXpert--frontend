import { Stack } from "expo-router";

import { useAuthStore } from "@/store/auth.store";

/**
 * Customer area, state-driven (same idea as the dealer layout):
 *   no name yet  -> onboarding (the only reachable screen)
 *   has a name   -> the customer tabs
 *
 * A new customer arrives with only a phone number. Saving their name in
 * onboarding updates the store, which flips these guards and moves them to Home.
 * The state comes from the session, so it also survives an app restart.
 */
export default function CustomerLayout() {
  const hasProfile = useAuthStore((state) => !!state.user?.name?.trim());

  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Protected guard={hasProfile}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!hasProfile}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}
