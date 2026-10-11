import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { PENDING_ROUTE } from "@/lib/dealerFlow";
import { useDealerAccess } from "@/lib/useDealerAccess";

/**
 * Shown only while the dealer's application is under review: they can already add
 * products, manage inventory and logistics; customers and bidding wait for approval.
 */
export function VerificationBanner({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { phase } = useDealerAccess();

  if (phase !== "PENDING") return null;

  return (
    <View
      className={`rounded-2xl border border-orange-200 bg-orange-50 p-4 ${compact ? "mb-3" : "mt-4"}`}
    >
      <View className="flex-row items-center">
        <Ionicons name="time-outline" size={18} color="#EA580C" />
        <Text className="ml-2 flex-1 text-sm font-bold text-orange-800">Account under review</Text>
      </View>

      <Text className="mt-2 text-xs leading-5 text-orange-700">
        {compact
          ? "Customers will see your products once your account is approved."
          : "You can add products and manage inventory and logistics now. Customers will see your products, and bidding opens, once your account is approved."}
      </Text>

      <Pressable
        onPress={() => router.push(PENDING_ROUTE as Href)}
        hitSlop={6}
        className="mt-2 self-start"
      >
        <Text className="text-xs font-semibold text-[#FF641F]">View verification status</Text>
      </Pressable>
    </View>
  );
}
