import { authApi } from "@/api/auth.api";
import { completeAuth, errorMessage } from "@/lib/authFlow";
import { getGoogleIdToken, GoogleNotConfiguredError } from "@/lib/googleSignIn";
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    useFonts,
} from "@expo-google-fonts/inter";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    Alert,
    SafeAreaView,
    Text,
    TextProps,
    TouchableOpacity,
    View,
} from "react-native";

type Tab = "dealer" | "customer";

const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  black: "Inter_800ExtraBold",
} as const;

// Text with Inter applied (Android needs a separate font family per weight)
function T({
  w = "regular",
  style,
  ...props
}: TextProps & { w?: keyof typeof FONT }) {
  return <Text {...props} style={[{ fontFamily: FONT[w] }, style]} />;
}

const TAB_CONTENT: Record<
  Tab,
  {
    description: string;
    features: { icon: keyof typeof Ionicons.glyphMap; text: string }[];
  }
> = {
  dealer: {
    description: "Manage inventory, bidding &\ncustomer inquiries",
    features: [
      { icon: "cube-outline", text: "List your products" },
      { icon: "bar-chart-outline", text: "Track orders & bids" },
      { icon: "people-outline", text: "Grow your customer base" },
    ],
  },
  customer: {
    description:
      "Buy, sell and bid on construction materials\nwith trusted suppliers",
    features: [
      { icon: "search-outline", text: "Discover products" },
      { icon: "pricetag-outline", text: "Compare prices & bid" },
      { icon: "people-outline", text: "Connect with verified suppliers" },
    ],
  },
};

export default function WelcomeScreen() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  const [googleLoading, setGoogleLoading] = useState(false);
  // Visual only: does NOT affect auth. Role is still chosen after verifying
  // (see choose-role).
  const [tab, setTab] = useState<Tab>("dealer");

  // No role is chosen here. Existing users go straight home; new users pick a
  // role after verifying (see choose-role).
  const handleContinue = () => {
    router.push("/(auth)/phone");
  };

  const handleGoogle = async () => {
    if (googleLoading) return;

    try {
      setGoogleLoading(true);

      const idToken = await getGoogleIdToken();
      if (!idToken) return; // cancelled

      await completeAuth(await authApi.loginWithGoogle(idToken), router);
    } catch (error) {
      if (error instanceof GoogleNotConfiguredError) {
        Alert.alert("Google sign-in", error.message);
        return;
      }

      console.error("Google sign-in error:", error);
      Alert.alert("Google sign-in failed", errorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  const content = TAB_CONTENT[tab];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 16 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            borderRadius: 24,
            paddingHorizontal: 22,
            paddingVertical: 24,
          }}
        >
          {/* ================= LOGO + HEADING ================= */}
          <View className="items-center">
            <View className="items-center">
              <T w="black" className="text-[40px] text-slate-800">
                N
                <T w="black" className="text-orange-500">
                  X
                </T>
              </T>
              <T w="semibold" className="text-[11px] text-slate-700">
                Nirman
                <T w="semibold" className="text-orange-500">
                  X
                </T>
                pert
              </T>
            </View>

            <T
              w="bold"
              className="mt-5 text-center text-[27px] leading-9 text-neutral-900"
            >
              Welcome to{"\n"}NirmanXpert
            </T>

            <T
              w="regular"
              className="mt-2 text-center text-[14px] text-slate-500"
            >
              Choose how you d like to get started
            </T>
          </View>

          {/* ================= TOGGLE + CONTENT ================= */}
          <View>
            <View className="flex-row rounded-2xl bg-gray-100 p-1.5">
              <TabButton
                label="Dealer / Supplier"
                icon="storefront"
                active={tab === "dealer"}
                onPress={() => setTab("dealer")}
              />
              <TabButton
                label="Customer"
                icon="cart-outline"
                active={tab === "customer"}
                onPress={() => setTab("customer")}
              />
            </View>

            <T
              w="regular"
              className="mt-5 text-center text-[14px] leading-5 text-slate-500"
            >
              {content.description}
            </T>

            <View className="mt-4 items-center gap-2.5">
              {content.features.map((f) => (
                <FeaturePill key={f.text} icon={f.icon} text={f.text} />
              ))}
            </View>
          </View>

          {/* ================= ACTIONS + STATS ================= */}
          <View>
            <View className="mb-5 h-[1px] bg-slate-200" />

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleContinue}
              className="flex-row items-center justify-center rounded-2xl bg-orange-500 py-4"
            >
              <Ionicons name="call-outline" size={20} color="#ffffff" />
              <T w="bold" className="ml-2 text-[15px] text-white">
                Continue with Phone Number
              </T>
            </TouchableOpacity>

            <View className="my-4 flex-row items-center">
              <View className="h-[1px] flex-1 bg-slate-200" />
              <T w="medium" className="mx-4 text-[13px] text-slate-500">
                or
              </T>
              <View className="h-[1px] flex-1 bg-slate-200" />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleGoogle}
              disabled={googleLoading}
              className="flex-row items-center justify-center rounded-2xl border-2 border-slate-200 bg-white py-3.5"
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" />
              <T w="semibold" className="ml-3 text-[15px] text-neutral-900">
                {googleLoading ? "Please wait..." : "Continue with Google"}
              </T>
            </TouchableOpacity>

            <View className="mt-6 flex-row items-center justify-center gap-6">
              <Stat number="10K+" label="Dealers" />
              <Stat number="50K+" label="Products" />
              <Stat number="100%" label="Verified" />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ========================================================= */
/* TAB BUTTON (Dealer / Supplier, Customer) */
/* ========================================================= */

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={
        active
          ? {
              shadowColor: "#f97316",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 8,
              elevation: 6,
            }
          : undefined
      }
      className={`flex-1 flex-row items-center justify-center rounded-xl px-5 py-3 ${
        active ? "bg-orange-500" : "bg-transparent"
      }`}
    >
      {/* Icon badge */}
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          active ? "bg-white/25" : "bg-slate-200/70"
        }`}
      >
        <Ionicons
          name={icon}
          size={16}
          color={active ? "#ffffff" : "#64748b"}
        />
      </View>

      <T
        w={active ? "bold" : "semibold"}
        numberOfLines={1}
        adjustsFontSizeToFit
        className={`ml-2 text-[14px] ${
          active ? "text-white" : "text-slate-500"
        }`}
      >
        {label}
      </T>
    </TouchableOpacity>
  );
}

/* ========================================================= */
/* FEATURE PILL */
/* ========================================================= */

function FeaturePill({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-row items-center rounded-full bg-slate-100 px-4 py-2">
      <Ionicons name={icon} size={16} color="#0f1d3a" />
      <T w="medium" className="ml-2 text-[13px] text-slate-900">
        {text}
      </T>
    </View>
  );
}

/* ========================================================= */
/* STAT */
/* ========================================================= */

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <View className="items-center">
      <T w="bold" className="text-[19px] text-orange-500">
        {number}
      </T>
      <T w="regular" className="mt-0.5 text-[12px] text-slate-500">
        {label}
      </T>
    </View>
  );
}
