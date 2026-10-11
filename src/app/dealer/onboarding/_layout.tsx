import { Stack } from "expo-router";

// The dealer layout (app/dealer/_layout.tsx) decides which ONE screen in this
// stack is legal. Gestures are off because the stack only ever holds that screen;
// there is no valid earlier screen to swipe back to.
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: "fade",
      }}
    />
  );
}
