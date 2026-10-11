import { useState } from "react";
import { Alert, Pressable, Switch, Text, TextInput, View } from "react-native";

import { buildUpsertPayload } from "@/lib/inventory";
import type { UpsertInventoryPayload } from "@/types/inventory";

export type InventoryFormInitial = {
  price: string;
  stock: string;
  availableForBidding: boolean;
  isClearance: boolean;
  clearancePrice: string;
};

export const EMPTY_FORM: InventoryFormInitial = {
  price: "",
  stock: "",
  availableForBidding: false,
  isClearance: false,
  clearancePrice: "",
};

/** Price / stock / bidding / clearance. Shared by Add Product and Edit Product. */
export function InventoryForm({
  initial,
  unit,
  submitLabel,
  saving,
  biddingLocked = false,
  onSubmit,
}: {
  initial: InventoryFormInitial;
  unit: string | null;
  submitLabel: string;
  saving: boolean;
  /** Bidding opens only after the dealer is approved. */
  biddingLocked?: boolean;
  onSubmit: (payload: UpsertInventoryPayload) => void;
}) {
  const [form, setForm] = useState<InventoryFormInitial>(initial);

  const set = <K extends keyof InventoryFormInitial>(key: K, value: InventoryFormInitial[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = () => {
    if (saving) return;

    const result = buildUpsertPayload(form);

    if (!result.ok) {
      Alert.alert("Check the details", result.message);
      return;
    }

    onSubmit(result.payload);
  };

  return (
    <View className="rounded-2xl border border-gray-200 bg-white p-4">
      <Field
        label="Price (₹)"
        placeholder="e.g. 380"
        value={form.price}
        onChangeText={(value: string) => set("price", value)}
        keyboardType="decimal-pad"
      />

      <Field
        label={unit ? `Stock (${unit})` : "Stock"}
        placeholder="e.g. 450"
        value={form.stock}
        onChangeText={(value: string) => set("stock", value)}
        keyboardType="number-pad"
      />

      <ToggleRow
        title="Available for bidding"
        hint={
          biddingLocked
            ? "Unlocks after your account is approved."
            : "Let this product take part in live bidding."
        }
        disabled={biddingLocked}
        value={form.availableForBidding}
        onValueChange={(value: boolean) => set("availableForBidding", value)}
      />

      <ToggleRow
        title="Clearance"
        hint="Mark this stock to be cleared at a lower price."
        value={form.isClearance}
        onValueChange={(value: boolean) => set("isClearance", value)}
      />

      {form.isClearance && (
        <View className="mt-3">
          <Field
            label="Clearance price (₹)"
            placeholder="Optional, not above the regular price"
            value={form.clearancePrice}
            onChangeText={(value: string) => set("clearancePrice", value)}
            keyboardType="decimal-pad"
          />
        </View>
      )}

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        className={`mt-5 items-center rounded-xl py-4 ${saving ? "bg-orange-300" : "bg-[#FF641F]"}`}
      >
        <Text className="font-bold text-white">{saving ? "Saving..." : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType: "decimal-pad" | "number-pad";
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
        className="rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3.5 text-[#111827]"
      />
    </View>
  );
}

function ToggleRow({
  title,
  hint,
  value,
  disabled = false,
  onValueChange,
}: {
  title: string;
  hint: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View
      className={`flex-row items-center justify-between border-t border-gray-100 py-3 ${
        disabled ? "opacity-60" : ""
      }`}
    >
      <View className="mr-4 flex-1">
        <Text className="text-sm font-semibold text-[#111827]">{title}</Text>
        <Text className="mt-0.5 text-xs text-gray-500">{hint}</Text>
      </View>

      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: "#E5E7EB", true: "#FDBA74" }}
        thumbColor={value ? "#FF641F" : "#FFFFFF"}
      />
    </View>
  );
}
