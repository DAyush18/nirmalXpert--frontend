import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";

import {
  isPathAllowed,
  STEP_ROUTES,
  type DealerGate,
  type StepKey,
} from "@/lib/dealerFlow";
import { useDealerStore } from "@/store/dealer.store";

/**
 * Call after a step has been saved successfully.
 *
 * It refreshes the dealer state and returns the new gate. In the normal case it
 * does NOT navigate: the dealer layout (app/dealer/_layout.tsx) moves the dealer
 * to wherever that state says they belong (next step, or the status page).
 */
export function useCompleteStep(step: StepKey) {
  const router = useRouter();

  return useCallback(async (): Promise<DealerGate> => {
    const gate = await useDealerStore.getState().completeStep(step);

    // Every step is done and the dealer must now press Submit. The caller
    // (the last step) does that, so there is nothing to warn about.
    if (gate.readyToSubmit) return gate;

    // Saved, but the server still lists this very step as unfinished.
    if (gate.currentStep === step) {
      Alert.alert(
        "Some information is still missing",
        "Your changes were saved, but this step is not complete yet. Please review the form and try again.",
      );
      return gate;
    }

    // Only in "manual fix" mode: this screen is still legal, so the layout will
    // not move the dealer. Return them to the status page.
    if (isPathAllowed(gate, STEP_ROUTES[step])) {
      router.replace(gate.route as Href);
    }

    return gate;
  }, [router, step]);
}
