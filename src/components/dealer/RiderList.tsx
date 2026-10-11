import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { RiderCard } from "@/components/dealer/RiderCard";
import { errorMessage } from "@/lib/authFlow";
import { riderStats } from "@/lib/orders";
import { useRidersStore } from "@/store/riders.store";
import type { Rider } from "@/types/orders";

const FORM = "/dealer/orders/riders/form";

/**
 * Logistics partners list, shared by:
 *   manage mode  (Orders -> Logistics Partners): Edit / Call / Remove
 *   select mode  (Assign Logistics on an order):  Edit / Call / Select
 */
export function RiderList({
  mode,
  assignedRiderId,
  selectingId,
  onSelect,
}: {
  mode: "manage" | "select";
  assignedRiderId?: string | null;
  /** select mode: the rider whose assignment is running right now */
  selectingId?: string | null;
  onSelect?: (rider: Rider) => void;
}) {
  const router = useRouter();

  const status = useRidersStore((state) => state.status);
  const riders = useRidersStore((state) => state.riders);
  const error = useRidersStore((state) => state.error);
  const fetchRiders = useRidersStore((state) => state.fetch);

  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRiders();
    }, [fetchRiders]),
  );

  const stats = useMemo(() => riderStats(riders), [riders]);

  const openAdd = () => router.push(FORM as Href);
  const openEdit = (rider: Rider) => router.push(`${FORM}?riderId=${rider.id}` as Href);

  const confirmRemove = (rider: Rider) =>
    Alert.alert(
      "Remove logistics partner",
      `${rider.name} will no longer appear in your list. Past deliveries are kept.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingId(rider.id);
              await dealerApi.removeRider(rider.id);
              useRidersStore.getState().remove(rider.id);
            } catch (err) {
              // e.g. 409 "This rider has deliveries in progress"
              Alert.alert("Unable to remove", errorMessage(err));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRiders();
    setRefreshing(false);
  };

  const header = (
    <View>
      <Pressable
        onPress={openAdd}
        className="mb-3 flex-row items-center justify-center rounded-full bg-[#071226] py-3.5"
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text className="ml-1 text-sm font-bold text-white">Add Logistics Partner</Text>
      </Pressable>

      {status === "ready" && riders.length > 0 && (
        <View className="mb-3 flex-row gap-2">
          <Stat value={stats.total} label="Total Drivers" />
          <Stat value={stats.onDuty} label="Active Now" />
          <Stat value={stats.available} label="Available" />
        </View>
      )}

      {error && riders.length > 0 && (
        <Text className="mb-3 text-center text-xs text-red-600">Could not refresh: {error}</Text>
      )}
    </View>
  );

  const empty =
    status === "idle" || status === "loading" ? (
      <View className="items-center py-16">
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    ) : status === "error" ? (
      <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
        <Text className="text-center text-base font-semibold text-gray-900">
          Unable to load logistics partners
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500">{error}</Text>
        <Pressable onPress={() => fetchRiders()} className="mt-5 rounded-xl bg-[#FF641F] px-8 py-3">
          <Text className="font-bold text-white">Try Again</Text>
        </Pressable>
      </View>
    ) : (
      <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
        <Ionicons name="bus-outline" size={36} color="#9CA3AF" />
        <Text className="mt-3 text-center text-base font-semibold text-gray-900">
          No logistics partners yet
        </Text>
        <Text className="mt-1 text-center text-sm text-gray-500">
          Add a driver to start assigning deliveries.
        </Text>
      </View>
    );

  return (
    <FlatList
      data={riders}
      keyExtractor={(rider: Rider) => rider.id}
      renderItem={({ item }: { item: Rider }) => (
        <RiderCard
          rider={item}
          mode={mode}
          assigned={item.id === assignedRiderId}
          busy={item.id === selectingId || item.id === removingId}
          onEdit={() => openEdit(item)}
          onRemove={() => confirmRemove(item)}
          onSelect={() => onSelect?.(item)}
        />
      )}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#F97316"
          colors={["#F97316"]}
        />
      }
    />
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-gray-200 bg-white py-4">
      <Text className="text-[22px] font-bold text-[#071226]">{value}</Text>
      <Text className="mt-0.5 text-xs text-gray-500">{label}</Text>
    </View>
  );
}
