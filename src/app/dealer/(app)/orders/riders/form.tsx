import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { errorMessage } from "@/lib/authFlow";
import { formatPhone, normalizeRider, validateRiderForm } from "@/lib/orders";
import { useRidersStore } from "@/store/riders.store";

/**
 * Add or edit a logistics partner. The backend stores a name and a phone number
 * only (POST /dealer/riders, PATCH /dealer/riders/:id), so the form has just those.
 */
export default function RiderFormScreen() {
  const router = useRouter();
  const { riderId } = useLocalSearchParams<{ riderId?: string }>();

  const existing = useRidersStore((state) => state.riders.find((r) => r.id === riderId));
  const isEdit = !!riderId;

  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing ? formatPhone(existing.phone) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;

    const result = validateRiderForm({ name, phone });
    if (!result.ok) {
      Alert.alert("Check the details", result.message);
      return;
    }

    try {
      setSaving(true);

      const raw = isEdit
        ? await dealerApi.updateRider(riderId as string, result.value)
        : await dealerApi.createRider(result.value);

      const saved = normalizeRider(raw);
      if (saved) {
        // keep the in-progress count we already know when editing
        useRidersStore.getState().upsert({ ...saved, openDeliveries: existing?.openDeliveries ?? 0 });
      }
      void useRidersStore.getState().fetch();

      Alert.alert(
        "Saved",
        isEdit ? "Logistics partner updated." : "Logistics partner added.",
        [{ text: "OK", onPress: () => router.back() }],
        { cancelable: false },
      );
    } catch (error) {
      // e.g. 409 "A rider with this phone number already exists"
      Alert.alert("Unable to save", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-2">
          <Ionicons name="chevron-back" size={24} color="#071226" />
        </Pressable>
        <Text className="text-[18px] font-bold text-[#071226]">
          {isEdit ? "Edit Logistics Partner" : "Add Logistics Partner"}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <Text className="mb-4 text-[17px] font-bold text-[#071226]">Driver Information</Text>

            <Field
              label="Driver Name *"
              placeholder="e.g. Vijay Kumar"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Field
              label="Mobile Number *"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Pressable
              onPress={save}
              disabled={saving}
              className={`mt-2 items-center rounded-xl py-4 ${
                saving ? "bg-green-300" : "bg-green-600"
              }`}
            >
              <Text className="font-bold text-white">
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Partner"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardType?: "default" | "phone-pad";
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
