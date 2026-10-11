import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, SafeAreaView, Text, View } from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { RiderList } from "@/components/dealer/RiderList";
import { errorMessage } from "@/lib/authFlow";
import { normalizeOrder, orderTitle } from "@/lib/orders";
import { findOrder, useOrdersStore } from "@/store/orders.store";
import type { Rider } from "@/types/orders";

/** "Assign Logistics": pick the driver for an order. POST /dealer/riders/assign */
export default function AssignLogisticsScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const order = useOrdersStore((state) => findOrder(state.lists, orderId));
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const select = async (rider: Rider) => {
    if (selectingId) return;

    try {
      setSelectingId(rider.id);

      await dealerApi.assignRider(orderId, rider.id);

      // read the order back so the card / detail show the new driver
      const fresh = normalizeOrder(await dealerApi.getOrder(orderId));
      if (fresh) useOrdersStore.getState().replaceOrder(fresh);
      void useOrdersStore.getState().refreshLoaded();

      Alert.alert(
        "Logistics assigned",
        `${rider.name} will deliver this order.`,
        [{ text: "OK", onPress: () => router.back() }],
        { cancelable: false },
      );
    } catch (error) {
      // e.g. "Delivery has already started; the rider cannot be changed"
      Alert.alert("Unable to assign", errorMessage(error));
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <View className="px-4 pb-1 pt-4">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} hitSlop={10} className="mr-2">
            <Ionicons name="chevron-back" size={24} color="#071226" />
          </Pressable>
          <Text className="text-[18px] font-bold text-[#071226]">Select Logistics</Text>
        </View>

        {order && (
          <Text numberOfLines={1} className="ml-8 mt-1 text-xs text-gray-500">
            #{order.orderNumber} · {orderTitle(order)}
          </Text>
        )}
      </View>

      <RiderList
        mode="select"
        assignedRiderId={order?.delivery?.riderId ?? null}
        selectingId={selectingId}
        onSelect={select}
      />
    </SafeAreaView>
  );
}
