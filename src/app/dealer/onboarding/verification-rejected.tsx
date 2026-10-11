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
  DOCUMENT_LABELS,
  getDealerGate,
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
 * Rejection SUMMARY. A rejected dealer is normally sent straight to the one step
 * that needs correcting (with the reviewer's reason shown on that screen), so this
 * screen only appears in two cases:
 *   1. every rejected step has been corrected -> "Resubmit for review"
 *   2. the rejection reason could not be tied to a step -> let the dealer pick one
 */
export default function VerificationRejectedScreen() {
  const router = useRouter();

  const me = useDealerStore((state) => state.me);
  const fixedSteps = useDealerStore((state) => state.fixedSteps);
  const fetchDealer = useDealerStore((state) => state.fetch);
  const logout = useAuthStore((state) => state.logout);

  const [submitting, setSubmitting] = useState(false);

  const gate = useMemo(() => getDealerGate(me, fixedSteps), [me, fixedSteps]);

  const issues = me?.issues ?? [];
  const rejectedDocuments = (me?.documents ?? []).filter(
    (document) => document.status === "REJECTED" && document.rejectionReason,
  );

  const handleResubmit = async () => {
    if (submitting) return;

    try {
      setSubmitting(true);

      await dealerApi.submit();

      const latest = await fetchDealer({ force: true });

      // PENDING -> the dealer layout moves them to the pending screen.
      if (latest?.profile?.verificationStatus === "REJECTED") {
        Alert.alert(
          "Not resubmitted yet",
          "We could not resubmit your application. Please try again.",
        );
      }
    } catch (error) {
      console.error("Resubmit failed:", error);

      const message = isAxiosError(error)
        ? error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to resubmit your application."
        : "Something went wrong. Please try again.";

      Alert.alert("Unable to resubmit", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 40,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <View
            className={`h-24 w-24 items-center justify-center rounded-full ${
              gate.needsResubmit ? "bg-orange-100" : "bg-red-100"
            }`}
          >
            <View
              className={`h-16 w-16 items-center justify-center rounded-full ${
                gate.needsResubmit ? "bg-orange-500" : "bg-red-500"
              }`}
            >
              <Text className="text-3xl font-bold text-white">
                {gate.needsResubmit ? "✓" : "!"}
              </Text>
            </View>
          </View>

          <Text className="mt-6 text-center text-2xl font-bold text-[#111827]">
            {gate.needsResubmit ? "Ready to Resubmit" : "Action Required"}
          </Text>

          <Text className="mt-3 max-w-sm text-center text-sm leading-6 text-gray-500">
            {gate.needsResubmit
              ? "You have corrected everything that was rejected. Resubmit your application so our team can review it again."
              : "We reviewed your dealer application and found information that needs to be corrected."}
          </Text>
        </View>

        {issues.length > 0 && (
          <View className="mt-8">
            <Text className="mb-3 text-lg font-bold text-[#111827]">
              {gate.needsResubmit ? "What was rejected" : "What needs to be fixed?"}
            </Text>

            {issues.map((issue, index) => (
              <View
                key={`${issue.type}-${index}`}
                className="mb-3 rounded-2xl border border-red-200 bg-red-50 p-5"
              >
                <Text className="font-semibold text-red-800">
                  {issue.type === "PROFILE"
                    ? "Information needs correction"
                    : "Action required"}
                </Text>

                <Text className="mt-2 text-sm leading-5 text-red-700">
                  {issue.reason}
                </Text>
              </View>
            ))}
          </View>
        )}

        {rejectedDocuments.length > 0 && (
          <View className="mt-4">
            <Text className="mb-3 text-lg font-bold text-[#111827]">
              Rejected Documents
            </Text>

            {rejectedDocuments.map((document) => (
              <View
                key={document.type}
                className="mb-3 rounded-2xl border border-gray-200 bg-white p-5"
              >
                <Text className="font-semibold text-[#111827]">
                  {DOCUMENT_LABELS[document.type] ?? document.type}
                </Text>

                <Text className="mt-2 text-sm leading-5 text-gray-600">
                  {document.rejectionReason}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Case 1: everything corrected */}
        {gate.needsResubmit && (
          <Pressable
            onPress={handleResubmit}
            disabled={submitting}
            className={`mt-7 items-center rounded-xl py-4 ${
              submitting ? "bg-orange-300" : "bg-[#FF641F]"
            }`}
          >
            {submitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#FFFFFF" />
                <Text className="ml-2 font-bold text-white">Submitting...</Text>
              </View>
            ) : (
              <Text className="font-bold text-white">Resubmit for Review</Text>
            )}
          </Pressable>
        )}

        {/* Case 2: we cannot tell which step was rejected */}
        {gate.manualFix && (
          <View className="mt-7">
            <Text className="mb-3 text-sm text-gray-500">
              Choose the section you want to update:
            </Text>

            {(Object.keys(STEP_ROUTES) as StepKey[]).map((step) => (
              <Pressable
                key={step}
                onPress={() => router.push(STEP_ROUTES[step] as Href)}
                className="mb-3 items-center rounded-xl border border-[#FF641F] py-3"
              >
                <Text className="font-bold text-[#FF641F]">{STEP_TITLES[step]}</Text>
              </Pressable>
            ))}

            <Pressable
              onPress={handleResubmit}
              disabled={submitting}
              className={`mt-2 items-center rounded-xl py-4 ${
                submitting ? "bg-orange-300" : "bg-[#FF641F]"
              }`}
            >
              <Text className="font-bold text-white">
                {submitting ? "Submitting..." : "Resubmit for Review"}
              </Text>
            </Pressable>
          </View>
        )}

        <Pressable onPress={logout} className="mt-6 items-center px-4 py-2">
          <Text className="text-sm text-gray-500">Log out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
