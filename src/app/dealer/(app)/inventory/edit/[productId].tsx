import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import {
    EMPTY_FORM,
    InventoryForm,
    type InventoryFormInitial,
} from "@/components/dealer/InventoryForm";
import { errorMessage } from "@/lib/authFlow";
import { itemFromSave } from "@/lib/inventory";
import { useDealerAccess } from "@/lib/useDealerAccess";
import { useInventoryStore } from "@/store/inventory.store";
import type { InventoryItem, UpsertInventoryPayload } from "@/types/inventory";

/**
 * One form for both flows (PUT /dealer/inventory/:productId is an upsert):
 *   product already in the inventory -> "Edit Product", pre-filled
 *   product only in the catalog      -> "Add Product", empty form
 */
export default function InventoryFormScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId: string }>();

  const item = useInventoryStore((state) =>
    state.items.find((i) => i.productId === productId),
  );
  const cached = useInventoryStore((state) => state.catalog[productId]);

  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const { canBid } = useDealerAccess();

  // Opened without the data in memory (app restarted on this screen, or a direct
  // link): load the inventory, then fall back to the catalog.
  useEffect(() => {
    if (item || (cached && !cached.inInventory)) return;

    let cancelled = false;

    (async () => {
      setResolving(true);

      await useInventoryStore.getState().fetch();

      const state = useInventoryStore.getState();
      const known =
        state.items.some((i) => i.productId === productId) ||
        !!state.catalog[productId];

      if (!known) {
        try {
          await state.loadCatalog();
        } catch {
          // handled below as "not found"
        }
      }

      if (!cancelled) setResolving(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const info = item ?? cached;
  const isEdit = !!item;

  const goBackToInventory = () => router.dismissTo("/dealer/inventory" as Href);

  const save = async (payload: UpsertInventoryPayload) => {
    if (saving || !info) return;

    try {
      setSaving(true);

      await dealerApi.upsertInventory(productId, payload);

      useInventoryStore
        .getState()
        .upsertItem(itemFromSave(info, payload, item?.id));

      Alert.alert(
        "Saved",
        isEdit
          ? "Your product was updated."
          : "The product was added to your inventory.",
        [{ text: "OK", onPress: goBackToInventory }],
        { cancelable: false },
      );
    } catch (error) {
      console.error("Save inventory error:", error);
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
          {isEdit ? "Edit Product" : "Add Product"}
        </Text>
      </View>

      {!info ? (
        <View className="flex-1 items-center justify-center px-6">
          {resolving ? (
            <ActivityIndicator size="large" color="#F97316" />
          ) : (
            <>
              <Text className="text-center text-base font-semibold text-gray-900">
                Product not found
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="mt-5 rounded-xl bg-[#FF641F] px-8 py-3"
              >
                <Text className="font-bold text-white">Go back</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          >
            {/* Read-only product details */}
            <View className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
              <Text className="text-[17px] font-bold text-[#071226]">
                {info.name}
              </Text>

              <View className="mt-3">
                {info.sku && <Detail label="SKU" value={info.sku} />}
                {info.brand && <Detail label="Brand" value={info.brand} />}
                <Detail label="Category" value={info.categoryName} />
                {info.unit && <Detail label="Unit" value={info.unit} />}
              </View>
            </View>

            <InventoryForm
              key={productId}
              initial={item ? toForm(item) : EMPTY_FORM}
              unit={info.unit}
              submitLabel={isEdit ? "Save Changes" : "Add to Inventory"}
              saving={saving}
              biddingLocked={!canBid}
              onSubmit={save}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function toForm(item: InventoryItem): InventoryFormInitial {
  return {
    price: String(item.price),
    stock: String(item.stock),
    availableForBidding: item.availableForBidding,
    isClearance: item.isClearance,
    clearancePrice:
      item.clearancePrice != null ? String(item.clearancePrice) : "",
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1.5 flex-row">
      <Text className="w-20 text-xs text-gray-500">{label}</Text>
      <Text className="flex-1 text-xs font-medium text-[#111827]">{value}</Text>
    </View>
  );
}
