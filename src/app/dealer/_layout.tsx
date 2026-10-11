import { Redirect, Stack, usePathname, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import {
    ActivityIndicator,
    AppState,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { getDealerGate, isPathAllowed } from "@/lib/dealerFlow";
import { useAuthStore } from "@/store/auth.store";
import { useDealerStore } from "@/store/dealer.store";

/**
 * The ONLY place that decides where a dealer may be.
 *
 *   restore session (root layout) -> fetch /dealer/me -> getDealerGate()
 *     APPROVED            -> (app)        dealer home / tabs
 *     everything else     -> onboarding   exactly one legal screen at a time
 *
 * Screens never navigate "forward" themselves. They save, refresh the dealer
 * state, and this layout moves the dealer to wherever the state says they belong.
 */
export default function DealerLayout() {
  const pathname = usePathname();

  const status = useDealerStore((state) => state.status);
  const me = useDealerStore((state) => state.me);
  const fixedSteps = useDealerStore((state) => state.fixedSteps);
  const fetchDealer = useDealerStore((state) => state.fetch);

  // Restore on every cold start / remount (session restore -> fetch status).
  useEffect(() => {
    fetchDealer();
  }, [fetchDealer]);

  // Pick up approvals / rejections that happened while the app was backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") fetchDealer();
    });
    return () => subscription.remove();
  }, [fetchDealer]);

  const gate = useMemo(
    () => (me ? getDealerGate(me, fixedSteps) : null),
    [me, fixedSteps],
  );

  // While waiting for review, re-check periodically so an approval (or a rejection)
  // is picked up without the dealer having to tap anything.
  const phase = gate?.phase;

  useEffect(() => {
    if (phase !== "PENDING") return;

    const timer = setInterval(() => {
      if (__DEV__) console.log("[dealer poll] checking status...");
      if (AppState.currentState === "active") fetchDealer();
    }, 15000);

    return () => clearInterval(timer);
  }, [phase, fetchDealer]);

  useEffect(() => {
    if (__DEV__ && gate) {
      console.log("[dealerGate]", gate.phase, "->", gate.route, gate.steps);
    }
  }, [gate?.phase, gate?.route]); // eslint-disable-line react-hooks/exhaustive-deps

  // No dealer state yet: never guess a screen, never render dealer content.
  if (!gate) {
    if (status === "error") return <LoadError onRetry={() => fetchDealer()} />;
    return <Splash />;
  }

  const inApp = gate.canUseApp; // approved, or pending after submitting
  const inOnboarding = gate.phase !== "APPROVED"; // status page and the fix screens
  const allowed = isPathAllowed(gate, pathname);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        {/* Protected = the other section is not even in the navigation history,
            so Android back / swipe can never reveal it. */}
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={inOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>

      {/* Direct link / stale route: cover it and move to the right screen. */}
      {!allowed && (
        <>
          <Redirect href={gate.route as Href} />
          <View style={StyleSheet.absoluteFill}>
            <Splash />
          </View>
        </>
      )}
    </View>
  );
}

function Splash() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F8FA]">
      <ActivityIndicator size="large" color="#F97316" />
      <Text className="mt-4 text-sm text-gray-500">
        Checking your account...
      </Text>
    </SafeAreaView>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  const logout = useAuthStore((state) => state.logout);
  const error = useDealerStore((state) => state.error);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F8FA] px-6">
      <Text className="text-center text-lg font-semibold text-gray-900">
        Unable to load your account
      </Text>

      <Text className="mt-2 text-center text-sm text-gray-500">
        {error ?? "Something went wrong."}
      </Text>

      <Pressable
        onPress={onRetry}
        className="mt-6 rounded-xl bg-[#FF641F] px-8 py-4"
      >
        <Text className="font-bold text-white">Try Again</Text>
      </Pressable>

      <Pressable onPress={logout} className="mt-4 px-4 py-2">
        <Text className="text-sm text-gray-500">Log out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
