import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

import { OrderCard } from "@/components/dealer/OrderCard";
import { RejectOrderModal } from "@/components/dealer/RejectOrderModal";
import { VerificationBanner } from "@/components/dealer/VerificationBanner";
import { ORDER_FILTERS, searchOrders } from "@/lib/orders";
import { useNow } from "@/lib/useNow";
import { useOrderActions } from "@/lib/useOrderActions";
import { useOrdersStore } from "@/store/orders.store";
import type { OrderAction, OrderFilter, OrderRow } from "@/types/orders";

export default function OrdersScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [query, setQuery] = useState("");
  const [rejecting, setRejecting] = useState<OrderRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const list = useOrdersStore((state) => state.lists[filter]);
  const counts = useOrdersStore((state) => state.counts);
  const fetchFirst = useOrdersStore((state) => state.fetchFirst);
  const fetchMore = useOrdersStore((state) => state.fetchMore);
  const fetchCounts = useOrdersStore((state) => state.fetchCounts);

  const { busyId, perform, reject } = useOrderActions();

  // Refresh when the tab gains focus or the filter changes. A list fetched in the
  // last 30 s is reused, so coming back from a detail screen keeps your scroll.
  useFocusEffect(
    useCallback(() => {
      fetchFirst(filter, { ifStale: true });
      fetchCounts();
    }, [fetchFirst, fetchCounts, filter]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFirst(filter), fetchCounts()]);
    setRefreshing(false);
  };

  const items = list?.items ?? [];
  const visible = useMemo(() => searchOrders(items, query), [items, query]);

  // Tick every 30 s only while a pending order has a deadline to show.
  const hasDeadline = items.some(
    (order) => order.status === "PENDING" && order.respondBy,
  );
  const now = useNow(hasDeadline, 30_000);

  const status = list?.status ?? "idle";
  const loadingFirst = status === "idle" || status === "loading";
  const failedFirst = status === "error" && items.length === 0;

  const openLogistics = () => router.push("/dealer/orders/riders" as Href);
  const openDetail = (order: OrderRow) =>
    router.push(`/dealer/orders/${order.id}` as Href);

  const onAction = (order: OrderRow, action: OrderAction) => {
    if (action === "REJECT") setRejecting(order);
    else perform(order, action);
  };

  const header = (
    <View>
      <VerificationBanner compact />

      <View className="mb-3 flex-row items-center rounded-full border border-gray-200 bg-white px-4">
        <Ionicons name="search-outline" size={16} color="#9CA3AF" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search orders, products, customers..."
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          className="ml-2 flex-1 py-3 text-sm text-[#111827]"
        />
        {query !== "" && (
          <Pressable hitSlop={10} onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="mb-3"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {ORDER_FILTERS.map((option) => {
          const active = option.key === filter;
          const count = counts?.[option.key];

          return (
            <Pressable
              key={option.key}
              onPress={() => setFilter(option.key)}
              className={`flex-row items-center rounded-full border px-4 py-2 ${
                active
                  ? "border-[#FF641F] bg-[#FF641F]"
                  : "border-gray-300 bg-white"
              }`}
            >
              <Text
                className={`text-xs font-medium ${active ? "text-white" : "text-gray-600"}`}
              >
                {option.label}
              </Text>

              {count != null && (
                <View
                  className={`ml-1.5 rounded-full px-1.5 ${active ? "bg-white" : "bg-gray-100"}`}
                >
                  <Text
                    className={`text-[10px] font-bold ${active ? "text-[#FF641F]" : "text-gray-500"}`}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={openLogistics}
        className="mb-3 flex-row items-center justify-center rounded-full bg-[#071226] py-3.5"
      >
        <Ionicons name="bus-outline" size={16} color="#FFFFFF" />
        <Text className="ml-2 text-sm font-bold text-white">
          Logistics Partners
        </Text>
      </Pressable>

      {list?.error && items.length > 0 && (
        <Text className="mb-3 text-center text-xs text-red-600">
          Could not refresh: {list.error}
        </Text>
      )}
    </View>
  );

  const empty = loadingFirst ? (
    <View className="items-center py-16">
      <ActivityIndicator size="large" color="#F97316" />
    </View>
  ) : failedFirst ? (
    <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
      <Text className="text-center text-base font-semibold text-gray-900">
        Unable to load orders
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500">
        {list?.error}
      </Text>
      <Pressable
        onPress={() => fetchFirst(filter)}
        className="mt-5 rounded-xl bg-[#FF641F] px-8 py-3"
      >
        <Text className="font-bold text-white">Try Again</Text>
      </Pressable>
    </View>
  ) : items.length === 0 ? (
    <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
      <Ionicons name="receipt-outline" size={36} color="#9CA3AF" />
      <Text className="mt-3 text-center text-base font-semibold text-gray-900">
        {filter === "ALL" ? "No orders yet" : "No orders here"}
      </Text>
      <Text className="mt-1 text-center text-sm text-gray-500">
        {filter === "ALL"
          ? "New orders from customers will show up here."
          : "No orders match this status right now."}
      </Text>
    </View>
  ) : (
    <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
      <Text className="text-center text-base font-semibold text-gray-900">
        No orders found
      </Text>
      <Text className="mt-1 text-center text-sm text-gray-500">
        Nothing loaded matches "{query.trim()}".
      </Text>
      <Pressable
        onPress={() => setQuery("")}
        className="mt-5 rounded-xl border border-[#FF641F] px-6 py-3"
      >
        <Text className="font-bold text-[#FF641F]">Clear search</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <FlatList
        data={visible}
        keyExtractor={(order: OrderRow) => order.id}
        renderItem={({ item }: { item: OrderRow }) => (
          <OrderCard
            order={item}
            now={now}
            busy={busyId === item.id}
            onAction={(action: OrderAction) => onAction(item, action)}
            onView={() => openDetail(item)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          list?.loadingMore ? (
            <View className="items-center py-4">
              <ActivityIndicator color="#F97316" />
            </View>
          ) : null
        }
        // searching only covers what is loaded, so do not page while a search is active
        onEndReached={() => {
          if (query.trim() === "") fetchMore(filter);
        }}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
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

      <RejectOrderModal
        visible={rejecting !== null}
        orderNumber={rejecting ? `#${rejecting.orderNumber}` : ""}
        busy={rejecting !== null && busyId === rejecting.id}
        onClose={() => setRejecting(null)}
        onSubmit={async (reason: string) => {
          if (!rejecting) return;
          if (await reject(rejecting, reason)) setRejecting(null);
        }}
      />
    </SafeAreaView>
  );
}
