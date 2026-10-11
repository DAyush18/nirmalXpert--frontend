import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import {
    getDealerGate,
    getStepNotices,
    HOME_ROUTE,
    STEP_ORDER,
    STEP_ROUTES,
    type StepKey,
} from "@/lib/dealerFlow";
import { useAuthStore } from "@/store/auth.store";
import { useDealerStore } from "@/store/dealer.store";

const STEP_TITLES: Record<StepKey, string> = {
  basic: "Business Details",
  verification: "Business Verification",
  contact: "Contact & Location",
};

/**
 * Verification status page (where the dealer lands after submitting).
 *
 *   PENDING   -> "under review"
 *   REJECTED  -> what is wrong, and a button to ONLY the step(s) to correct;
 *                once corrected, "Resubmit for Review"
 *   APPROVED  -> never shown: the dealer layout sends the dealer to the dashboard
 *
 * No automatic navigation here. When the status changes, app/dealer/_layout.tsx
 * moves the dealer.
 */
export default function VerificationStatusScreen() {
  const router = useRouter();

  const me = useDealerStore((state) => state.me);
  const fixedSteps = useDealerStore((state) => state.fixedSteps);
  const error = useDealerStore((state) => state.error);
  const fetchDealer = useDealerStore((state) => state.fetch);
  const logout = useAuthStore((state) => state.logout);

  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const gate = useMemo(() => getDealerGate(me, fixedSteps), [me, fixedSteps]);
  const isRejected = gate.phase === "REJECTED";

  const handleCheck = async () => {
    if (checking) return;

    try {
      setChecking(true);
      await fetchDealer({ force: true });
    } finally {
      setChecking(false);
    }
  };

  // replace (not push): the status page must not sit underneath the step, so the
  // dealer cannot swipe/back into it and bypass the correction.
  const goToStep = (step: StepKey) => router.replace(STEP_ROUTES[step] as Href);

  const handleResubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      await dealerApi.submit();

      const latest = await fetchDealer({ force: true });

      if (latest?.profile?.verificationStatus === "REJECTED") {
        Alert.alert(
          "Not resubmitted yet",
          "We could not resubmit your application. Please try again.",
        );
      }
    } catch (err) {
      console.error("Resubmit failed:", err);

      const message = isAxiosError(err)
        ? err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to resubmit your application."
        : "Something went wrong. Please try again.";

      Alert.alert("Unable to resubmit", message);
    } finally {
      setSubmitting(false);
    }
  };

  const rawReasons = (me?.issues ?? [])
    .map((issue) => issue.reason)
    .filter(Boolean);

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      {/* A pending dealer can use the dashboard meanwhile, so give them the way back. */}
      {gate.canUseApp && (
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace(HOME_ROUTE as Href)
          }
          hitSlop={10}
          className="flex-row items-center px-4 pt-4"
        >
          <Ionicons name="chevron-back" size={22} color="#071226" />
          <Text className="ml-1 text-sm font-semibold text-[#071226]">
            Dashboard
          </Text>
        </Pressable>
      )}

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          paddingVertical: 32,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View
          className={`mb-6 h-24 w-24 items-center justify-center rounded-full ${
            isRejected ? "bg-red-100" : "bg-orange-100"
          }`}
        >
          <View
            className={`h-16 w-16 items-center justify-center rounded-full ${
              isRejected ? "bg-red-500" : "bg-orange-500"
            }`}
          >
            <Text className="text-3xl font-bold text-white">
              {isRejected ? "!" : "✓"}
            </Text>
          </View>
        </View>

        {/* Title + description */}
        <Text className="text-center text-2xl font-bold text-[#111827]">
          {isRejected
            ? gate.needsResubmit
              ? "Ready to Resubmit"
              : "Action Required"
            : "Verification Submitted"}
        </Text>

        <Text className="mt-3 max-w-sm text-center text-sm leading-6 text-gray-500">
          {isRejected
            ? gate.needsResubmit
              ? "You have corrected everything that was rejected. Resubmit your application so our team can review it again."
              : "Your application was reviewed and some information needs to be corrected. Only the sections below need your attention."
            : "Your dealer profile and documents have been submitted. Our team will review them. Meanwhile you can add products and manage inventory and logistics; customers will see your products, and bidding opens, once you are approved."}
        </Text>

        {/* Status card */}
        <View
          className={`mt-8 w-full max-w-sm rounded-2xl border p-5 ${
            isRejected
              ? "border-red-200 bg-red-50"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <View className="flex-row items-center">
            {!isRejected && <ActivityIndicator size="small" color="#F97316" />}

            <Text
              className={`font-semibold ${
                isRejected ? "text-red-700" : "ml-3 text-orange-700"
              }`}
            >
              {isRejected ? "Verification Rejected" : "Verification Pending"}
            </Text>
          </View>

          <Text
            className={`mt-3 text-sm leading-5 ${
              isRejected ? "text-red-600" : "text-orange-600"
            }`}
          >
            {isRejected
              ? "Fix the items below and submit your application again."
              : "Your application is currently under review."}
          </Text>
        </View>

        {/* REJECTED: one card per step that needs work, with its reasons */}
        {isRejected &&
          !gate.manualFix &&
          gate.todoSteps.map((step) => {
            const notices = me ? getStepNotices(me, step) : [];

            return (
              <View
                key={step}
                className="mt-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5"
              >
                <Text className="font-semibold text-[#111827]">
                  {STEP_TITLES[step]}
                </Text>

                {notices.length > 0 ? (
                  notices.map((notice) => (
                    <Text
                      key={notice}
                      className="mt-2 text-sm leading-5 text-red-700"
                    >
                      • {notice}
                    </Text>
                  ))
                ) : (
                  <Text className="mt-2 text-sm leading-5 text-gray-600">
                    This section is incomplete.
                  </Text>
                )}

                <Pressable
                  onPress={() => goToStep(step)}
                  className="mt-4 items-center rounded-xl bg-[#FF641F] py-3"
                >
                  <Text className="font-bold text-white">
                    Update this section
                  </Text>
                </Pressable>
              </View>
            );
          })}

        {/* REJECTED but we cannot tell which section: show the raw reasons */}
        {isRejected && gate.manualFix && (
          <View className="mt-4 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5">
            <Text className="font-semibold text-[#111827]">
              What needs to change
            </Text>

            {rawReasons.length > 0 ? (
              rawReasons.map((reason) => (
                <Text
                  key={reason}
                  className="mt-2 text-sm leading-5 text-red-700"
                >
                  • {reason}
                </Text>
              ))
            ) : (
              <Text className="mt-2 text-sm leading-5 text-gray-600">
                Please review your details.
              </Text>
            )}

            <Text className="mb-1 mt-4 text-xs text-gray-500">
              Choose the section to update:
            </Text>

            {STEP_ORDER.map((step) => (
              <Pressable
                key={step}
                onPress={() => goToStep(step)}
                className="mt-2 items-center rounded-xl border border-[#FF641F] py-3"
              >
                <Text className="font-bold text-[#FF641F]">
                  {STEP_TITLES[step]}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* PENDING: what happens next */}
        {!isRejected && (
          <View className="mt-5 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5">
            <Text className="font-semibold text-[#111827]">
              What happens next?
            </Text>

            <View className="mt-4">
              <Step number="1" text="Your submitted information is reviewed." />
              <Step number="2" text="Your business documents are verified." />
              <Step
                number="3"
                text="Your dealer account is approved or requires changes."
              />
            </View>
          </View>
        )}

        {error && (
          <Text className="mt-4 max-w-sm text-center text-sm text-red-600">
            {error}
          </Text>
        )}

        {/* Resubmit: explicit action, only once everything rejected is corrected */}
        {isRejected && (gate.needsResubmit || gate.manualFix) && (
          <Pressable
            onPress={handleResubmit}
            disabled={submitting}
            className={`mt-6 w-full max-w-sm items-center rounded-xl py-4 ${
              submitting ? "bg-orange-300" : "bg-[#FF641F]"
            }`}
          >
            {submitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="ml-2 font-bold text-white">Submitting...</Text>
              </View>
            ) : (
              <Text className="font-bold text-white">Resubmit for Review</Text>
            )}
          </Pressable>
        )}

        {/* Refresh status (also refreshes automatically when the app is reopened) */}
        <Pressable
          onPress={handleCheck}
          disabled={checking}
          className={`mt-4 w-full max-w-sm items-center rounded-xl py-4 ${
            isRejected ? "border border-gray-300 bg-white" : "bg-[#FF641F]"
          } ${checking ? "opacity-70" : ""}`}
        >
          {checking ? (
            <View className="flex-row items-center">
              <ActivityIndicator
                size="small"
                color={isRejected ? "#6B7280" : "#FFFFFF"}
              />
              <Text
                className={`ml-2 font-bold ${isRejected ? "text-gray-600" : "text-white"}`}
              >
                Checking...
              </Text>
            </View>
          ) : (
            <Text
              className={`font-bold ${isRejected ? "text-gray-600" : "text-white"}`}
            >
              Check Verification Status
            </Text>
          )}
        </Pressable>

        <Pressable onPress={logout} className="mt-3 px-4 py-2">
          <Text className="text-sm text-gray-500">Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <View className="mb-4 flex-row items-start">
      <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-gray-100">
        <Text className="text-xs font-bold text-gray-700">{number}</Text>
      </View>

      <Text className="flex-1 pt-1 text-sm leading-5 text-gray-600">
        {text}
      </Text>
    </View>
  );
}
