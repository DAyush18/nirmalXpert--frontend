import { isAxiosError } from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { authApi } from "@/api/auth.api";
import { errorMessage } from "@/lib/authFlow";
import { useAuthStore } from "@/store/auth.store";

type Role = "CUSTOMER" | "DEALER";

export default function ChooseRoleScreen() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<Role>("CUSTOMER");
  const [loading, setLoading] = useState(false);

  // Role selection only exists for a NEW identity that just verified its phone /
  // Google account. Without that pending token there is nothing to choose a role
  // for, so go back to the start. (Checked once on mount: the token is cleared on
  // purpose when the account is created.)
  useEffect(() => {
    if (!useAuthStore.getState().pendingRegistrationToken) {
      router.replace("/");
    }
  }, [router]);

  const startOver = () => {
    useAuthStore.getState().clearPendingRegistration();
    router.replace("/");
  };

  // Not a registration screen: the account is created here, in the background,
  // and the route guards then send the user straight to their onboarding.
  const continueNext = async () => {
    if (loading) return;

    const registrationToken = useAuthStore.getState().pendingRegistrationToken;

    if (!registrationToken) {
      startOver();
      return;
    }

    try {
      setLoading(true);

      const session = await authApi.register(registrationToken, selectedRole);

      // Saves the tokens and clears the temporary registration token.
      await useAuthStore.getState().setSession(session);
    } catch (error) {
      console.error("Account creation error:", error);

      if (isAxiosError(error) && error.response?.status === 401) {
        Alert.alert(
          "Verification expired",
          "Please verify your mobile number again.",
        );
        startOver();
        return;
      }

      Alert.alert("Unable to continue", errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-[22px] pt-9">
        {/* Header */}
        <Text className="text-[24px] font-bold text-slate-900">
          How do you want to use the app?
        </Text>

        <Text className="mt-1 text-[14px] text-slate-500">
          Choose one to continue.
        </Text>

        {/* Dealer / Supplier */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={loading}
          onPress={() => setSelectedRole("DEALER")}
          className={`mt-6 rounded-xl border px-[18px] py-[20px] ${
            selectedRole === "DEALER"
              ? "border-orange-500 bg-orange-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <View className="flex-row">
            {/* Icon */}
            <View
              className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                selectedRole === "DEALER" ? "bg-orange-500" : "bg-slate-100"
              }`}
            >
              <Text className="text-xl">▣</Text>
            </View>

            <View className="flex-1">
              <Text className="text-[16px] font-bold text-slate-900">
                Dealer / Supplier
              </Text>

              <Text className="mt-1 text-[12px] leading-[18px] text-slate-500">
                Sell construction materials, manage inventory, and grow your
                business
              </Text>

              {/* Features */}
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Feature text="List unlimited products" />
                <Feature text="Receive customer bids" />
                <Feature text="Analytics dashboard" />
                <Feature text="Verified badge" />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Customer */}
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={loading}
          onPress={() => setSelectedRole("CUSTOMER")}
          className={`mt-3 rounded-xl border px-[18px] py-[20px] ${
            selectedRole === "CUSTOMER"
              ? "border-orange-500 bg-orange-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <View className="flex-row">
            {/* Icon */}
            <View
              className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${
                selectedRole === "CUSTOMER" ? "bg-orange-500" : "bg-slate-100"
              }`}
            >
              <Text className="text-xl">▢</Text>
            </View>

            <View className="flex-1">
              <Text className="text-[16px] font-bold text-slate-900">
                Customer
              </Text>

              <Text className="mt-1 text-[12px] leading-[18px] text-slate-500">
                Browse, compare, and buy construction materials from trusted
                suppliers
              </Text>

              {/* Features */}
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Feature text="Compare prices" />
                <Feature text="Verified suppliers" />
                <Feature text="Fast delivery" />
                <Feature text="Order tracking" />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Bottom button */}
        <View className="mt-auto pb-6">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={continueNext}
            disabled={loading}
            className={`items-center rounded-xl py-4 ${
              loading ? "bg-orange-300" : "bg-orange-500"
            }`}
          >
            <Text className="text-[14px] font-bold text-white">
              {loading
                ? "Setting things up..."
                : `Continue as ${selectedRole === "CUSTOMER" ? "Customer" : "Dealer"}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={startOver}
            disabled={loading}
            className="mt-3 items-center py-2"
          >
            <Text className="text-sm text-slate-500">
              Use a different number
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* Feature pill */

function Feature({ text }: { text: string }) {
  return (
    <View className="rounded-full bg-slate-100 px-3 py-1.5">
      <Text className="text-[10px] text-slate-500">{text}</Text>
    </View>
  );
}
