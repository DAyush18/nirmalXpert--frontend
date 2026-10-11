import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import { formatPhone, riderStatus } from "@/lib/orders";
import type { Rider, RiderStatus } from "@/types/orders";

const STATUS: Record<RiderStatus, { label: string; pill: string; text: string }> = {
  ON_DUTY: { label: "On duty", pill: "bg-blue-100", text: "text-blue-600" },
  AVAILABLE: { label: "Available", pill: "bg-green-100", text: "text-green-600" },
  INACTIVE: { label: "Inactive", pill: "bg-gray-100", text: "text-gray-600" },
};

/**
 * One logistics partner. "manage" mode shows Remove, "select" mode (assigning to
 * an order) shows Select. The backend only stores a name and a phone number, so
 * that is all the card can show (plus how many deliveries are in progress).
 */
export function RiderCard({
  rider,
  mode,
  assigned = false,
  busy = false,
  onEdit,
  onRemove,
  onSelect,
}: {
  rider: Rider;
  mode: "manage" | "select";
  /** select mode: this rider is already on the order */
  assigned?: boolean;
  busy?: boolean;
  onEdit: () => void;
  onRemove?: () => void;
  onSelect?: () => void;
}) {
  const status = STATUS[riderStatus(rider)];

  return (
    <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="flex-row items-center">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
          <Ionicons name="bus-outline" size={22} color="#F97316" />
        </View>

        <View className="ml-3 flex-1">
          <Text numberOfLines={1} className="text-[16px] font-bold text-[#071226]">
            {rider.name}
          </Text>
          <Text className="mt-0.5 text-sm text-gray-400">{formatPhone(rider.phone)}</Text>
        </View>

        <View className={`rounded-full px-3 py-1 ${status.pill}`}>
          <Text className={`text-xs font-semibold ${status.text}`}>{status.label}</Text>
        </View>
      </View>

      <View className="mt-4">
        <Text className="text-xs text-gray-400">Deliveries in progress</Text>
        <Text className="mt-1 text-[15px] font-semibold text-[#071226]">{rider.openDeliveries}</Text>
      </View>

      <View className="mt-4 flex-row gap-2">
        <SmallButton icon="pencil-outline" label="Edit" onPress={onEdit} />
        <SmallButton
          icon="call-outline"
          label="Call"
          onPress={() => Linking.openURL(`tel:${rider.phone}`)}
        />

        {mode === "select" ? (
          <Pressable
            onPress={onSelect}
            disabled={busy || assigned}
            className={`flex-1 items-center justify-center rounded-full ${
              assigned ? "bg-gray-200" : busy ? "bg-orange-300" : "bg-[#FF641F]"
            }`}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text className={`text-sm font-semibold ${assigned ? "text-gray-500" : "text-white"}`}>
                {assigned ? "Assigned" : "Select"}
              </Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            onPress={onRemove}
            disabled={busy}
            className="flex-1 items-center justify-center rounded-full border border-red-300 bg-red-50"
          >
            <Text className="text-sm font-semibold text-red-600">Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-10 flex-1 flex-row items-center justify-center rounded-full border border-gray-300"
    >
      <Ionicons name={icon} size={14} color="#6B7280" />
      <Text className="ml-1.5 text-sm font-medium text-gray-600">{label}</Text>
    </Pressable>
  );
}
