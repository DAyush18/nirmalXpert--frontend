import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Text, TextInput, View } from "react-native";

import { REJECT_REASONS, validateRejectReason } from "@/lib/orders";

/** The backend requires a reason (3 to 200 characters) to reject an order. */
export function RejectOrderModal({
  visible,
  orderNumber,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  orderNumber: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  const submit = () => {
    if (busy) return;

    const result = validateRejectReason(reason);
    if (!result.ok) {
      Alert.alert("Reason required", result.message);
      return;
    }

    onSubmit(result.reason);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={busy ? undefined : onClose}>
        <Pressable className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
          <Text className="text-[17px] font-bold text-[#071226]">Reject order</Text>
          <Text className="mt-1 text-sm text-gray-500">
            {orderNumber}: the customer will see your reason. Stock goes back to your inventory.
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {REJECT_REASONS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setReason(preset)}
                className={`rounded-full border px-3 py-1.5 ${
                  reason === preset ? "border-[#FF641F] bg-orange-50" : "border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs ${
                    reason === preset ? "font-semibold text-[#FF641F]" : "text-gray-600"
                  }`}
                >
                  {preset}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason for rejecting"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={200}
            className="mt-4 min-h-[90px] rounded-xl border border-gray-200 bg-[#F8FAFC] px-4 py-3 text-[#111827]"
            style={{ textAlignVertical: "top" }}
          />

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onClose}
              disabled={busy}
              className="flex-1 items-center rounded-xl border border-gray-300 py-3.5"
            >
              <Text className="font-semibold text-gray-600">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={submit}
              disabled={busy}
              className={`flex-1 items-center rounded-xl py-3.5 ${busy ? "bg-red-300" : "bg-red-600"}`}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-bold text-white">Reject order</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
