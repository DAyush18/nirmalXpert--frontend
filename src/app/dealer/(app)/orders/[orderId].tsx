import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { OrderActionBar, OrderStatusPill } from "@/components/dealer/OrderCard";
import { RejectOrderModal } from "@/components/dealer/RejectOrderModal";
import { errorMessage } from "@/lib/authFlow";
import { formatPrice, formatRemaining, timeAgo } from "@/lib/dashboardFormat";
import { DELIVERY_LABEL, normalizeOrder } from "@/lib/orders";
import { useNow } from "@/lib/useNow";
import { useOrderActions } from "@/lib/useOrderActions";
import { findOrder, useOrdersStore } from "@/store/orders.store";
import type { OrderAction, OrderRow } from "@/types/orders";

/** The "eye" screen: everything about one order, with the same actions as the card. */
export default function OrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();

  const fromStore = useOrdersStore((state) => findOrder(state.lists, orderId));
  const [fetched, setFetched] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const { busyId, perform, reject } = useOrderActions();

  // Always read the latest from the server (the list can be a little old).
  const load = useCallback(async () => {
    try {
      setError(null);
      const order = normalizeOrder(await dealerApi.getOrder(orderId));

      if (order) {
        setFetched(order);
        useOrdersStore.getState().replaceOrder(order);
      } else {
        setError("This order could not be read.");
      }
    } catch (err) {
      setError(errorMessage(err, "Unable to load this order."));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  // the store copy is updated by actions, so prefer it over the first fetch
  const order = fromStore ?? fetched;

  const now = useNow(order?.status === "PENDING" && !!order.respondBy, 1000);

  const onAction = (action: OrderAction) => {
    if (!order) return;
    if (action === "REJECT") setRejecting(true);
    else perform(order, action);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-2">
          <Ionicons name="chevron-back" size={24} color="#071226" />
        </Pressable>
        <Text className="text-[18px] font-bold text-[#071226]">
          Order details
        </Text>
      </View>

      {!order ? (
        <View className="flex-1 items-center justify-center px-6">
          {loading ? (
            <ActivityIndicator size="large" color="#F97316" />
          ) : (
            <>
              <Text className="text-center text-base font-semibold text-gray-900">
                Unable to load this order
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500">
                {error}
              </Text>
              <Pressable
                onPress={() => {
                  setLoading(true);
                  load();
                }}
                className="mt-5 rounded-xl bg-[#FF641F] px-8 py-3"
              >
                <Text className="font-bold text-white">Try Again</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Header */}
          <View className="rounded-2xl border border-gray-200 bg-white p-4">
            <View className="flex-row items-center justify-between">
              <View className="mr-2 flex-1 flex-row items-center">
                <Text
                  numberOfLines={1}
                  className="mr-2 flex-shrink text-sm font-semibold text-gray-500"
                >
                  #{order.orderNumber}
                </Text>
                <OrderStatusPill status={order.status} />
              </View>
              {!!order.createdAt && (
                <Text className="text-xs text-gray-400">
                  {timeAgo(order.createdAt)}
                </Text>
              )}
            </View>

            <Text className="mt-3 text-[26px] font-bold text-[#071226]">
              {formatPrice(order.total)}
            </Text>

            {order.status === "PENDING" && !!order.respondBy && (
              <Text
                className={`mt-2 text-xs font-medium ${
                  formatRemaining(order.respondBy, now) === "Ended"
                    ? "text-red-600"
                    : "text-orange-600"
                }`}
              >
                {formatRemaining(order.respondBy, now) === "Ended"
                  ? "Response time has passed"
                  : `Respond within ${formatRemaining(order.respondBy, now)}`}
              </Text>
            )}

            {order.status === "REJECTED" && !!order.rejectionReason && (
              <Text className="mt-2 text-xs text-red-600">
                Reason: {order.rejectionReason}
              </Text>
            )}

            <OrderActionBar
              order={order}
              now={now}
              busy={busyId === order.id}
              onAction={onAction}
            />
          </View>

          {error && (
            <Text className="mt-3 text-center text-xs text-red-600">
              Could not refresh: {error}
            </Text>
          )}

          {/* Items */}
          <Section title="Items">
            {order.items.map((item, index) => (
              <View
                key={item.id}
                className={`flex-row items-start justify-between py-3 ${
                  index > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <View className="mr-3 flex-1">
                  <Text className="text-sm font-semibold text-[#111827]">
                    {item.name}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500">
                    {item.quantity}
                    {item.unit ? ` ${item.unit}` : ""} ×{" "}
                    {formatPrice(item.price)}
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-[#111827]">
                  {formatPrice(item.quantity * item.price)}
                </Text>
              </View>
            ))}
          </Section>

          {/* Customer */}
          <Section title="Delivery to">
            <Text className="text-sm font-semibold text-[#111827]">
              {order.customerName}
            </Text>
            {!!order.address && (
              <Text className="mt-1 text-sm leading-5 text-gray-600">
                {order.address}
              </Text>
            )}
            {!!order.customerPhone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}
                className="mt-3 flex-row items-center self-start rounded-full border border-gray-300 px-4 py-2"
              >
                <Ionicons name="call-outline" size={14} color="#6B7280" />
                <Text className="ml-1.5 text-sm font-medium text-gray-600">
                  Call {order.customerPhone}
                </Text>
              </Pressable>
            )}
          </Section>

          {/* Payment */}
          {order.payments.length > 0 && (
            <Section title="Payment">
              {order.payments.map((payment) => (
                <View
                  key={payment.id}
                  className="flex-row items-center justify-between py-1"
                >
                  <Text className="text-sm text-gray-600">
                    {payment.method} · {payment.status.toLowerCase()}
                  </Text>
                  <Text className="text-sm font-semibold text-[#111827]">
                    {formatPrice(payment.amount)}
                  </Text>
                </View>
              ))}
            </Section>
          )}

          {/* Logistics */}
          {order.delivery && (
            <Section title="Logistics">
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-sm font-semibold text-[#111827]">
                    {order.delivery.riderName ?? "Driver"}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500">
                    {DELIVERY_LABEL[order.delivery.status]}
                  </Text>
                </View>

                {!!order.delivery.riderPhone && (
                  <Pressable
                    onPress={() =>
                      Linking.openURL(`tel:${order.delivery?.riderPhone}`)
                    }
                    className="flex-row items-center rounded-full border border-gray-300 px-4 py-2"
                  >
                    <Ionicons name="call-outline" size={14} color="#6B7280" />
                    <Text className="ml-1.5 text-sm font-medium text-gray-600">
                      Call
                    </Text>
                  </Pressable>
                )}
              </View>
            </Section>
          )}
        </ScrollView>
      )}

      <RejectOrderModal
        visible={rejecting}
        orderNumber={order ? `#${order.orderNumber}` : ""}
        busy={!!order && busyId === order.id}
        onClose={() => setRejecting(false)}
        onSubmit={async (reason: string) => {
          if (!order) return;
          if (await reject(order, reason)) setRejecting(false);
        }}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-3 rounded-2xl border border-gray-200 bg-white p-4">
      <Text className="mb-2 text-[15px] font-bold text-[#111827]">{title}</Text>
      {children}
    </View>
  );
}
