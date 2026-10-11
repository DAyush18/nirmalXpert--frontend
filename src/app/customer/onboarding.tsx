import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { authApi } from "@/api/auth.api";
import { errorMessage } from "@/lib/authFlow";
import { useAuthStore } from "@/store/auth.store";

/**
 * Customer onboarding: the basic profile (PATCH /auth/profile).
 * Shown only while the customer has no name. Saving updates the store, which
 * flips the customer layout's guards and moves them to Home. No manual navigation.
 */
export default function CustomerOnboardingScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (saving) return;

    if (name.trim().length < 2) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    try {
      setSaving(true);

      const profile = await authApi.updateProfile({
        name: name.trim(),
        ...(email.trim() ? { email: email.trim().toLowerCase() } : {}),
      });

      useAuthStore.getState().updateUser({
        name: profile.name ?? name.trim(),
        email: profile.email ?? null,
      });
    } catch (error) {
      console.error("Customer onboarding error:", error);
      Alert.alert("Unable to save", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, padding: 20 }}
      >
        <View className="flex-1 justify-center">
          <Text className="mb-2 text-3xl font-bold text-[#071226]">
            Tell us about you
          </Text>

          <Text className="mb-8 text-sm text-gray-500">
            Just a couple of details to finish setting up your account.
          </Text>

          <View className="rounded-2xl border border-gray-200 bg-white p-5">
            <Field
              label="Your Name"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Field
              label="Email (optional)"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Pressable
              onPress={handleContinue}
              disabled={saving}
              className={`mt-2 items-center rounded-xl py-4 ${
                saving ? "bg-orange-300" : "bg-[#FF641F]"
              }`}
            >
              <Text className="font-bold text-white">
                {saving ? "Saving..." : "Continue"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={logout} className="mt-6 items-center px-4 py-2">
            <Text className="text-sm text-gray-500">Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-semibold text-[#111827]">{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3.5 text-[#111827]"
      />
    </View>
  );
}
