import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { formatPrice, formatRemaining, timeAgo } from "@/lib/dashboardFormat";
import {
  actionLabel,
  getOrderActions,
  ORDER_STATUS_META,
  orderQuantityText,
  orderTitle,
} from "@/lib/orders";
import type { OrderAction, OrderRow, OrderStatus } from "@/types/orders";

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];

  return (
    <View className={`rounded-full px-2.5 py-0.5 ${meta.pill}`}>
      <Text className={`text-[11px] font-semibold ${meta.text}`}>{meta.label}</Text>
    </View>
  );
}

/** Accept / Reject / Processing / Assign Logistics / Mark out for delivery ... */
export function OrderActionBar({
  order,
  now,
  busy,
  onAction,
  onView,
}: {
  order: OrderRow;
  now: number;
  busy: boolean;
  onAction: (action: OrderAction) => void;
  /** Omit on the detail screen (the eye button is only on cards). */
  onView?: () => void;
}) {
  const actions = getOrderActions(order, now);

  return (
    <View className="mt-4 flex-row flex-wrap items-center gap-2">
      {actions.map((action) => (
        <ActionButton
          key={action}
          action={action}
          label={actionLabel(action, order)}
          disabled={busy}
          busy={busy}
          onPress={() => onAction(action)}
        />
      ))}

      {onView && (
        <Pressable
          onPress={onView}
          hitSlop={6}
          className="h-10 w-12 items-center justify-center rounded-full border border-gray-300"
        >
          <Ionicons name="eye-outline" size={18} color="#6B7280" />
        </Pressable>
      )}
    </View>
  );
}

function ActionButton({
  action,
  label,
  disabled,
  busy,
  onPress,
}: {
  action: OrderAction;
  label: string;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  // Full class names so NativeWind can see them.
  if (action === "REJECT") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className="h-10 flex-row items-center rounded-full border border-red-300 bg-red-50 px-4"
      >
        <Ionicons name="information-circle-outline" size={15} color="#DC2626" />
        <Text className="ml-1.5 text-sm font-semibold text-red-600">{label}</Text>
      </Pressable>
    );
  }

  if (action === "ASSIGN") {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className="h-10 items-center justify-center rounded-full bg-blue-100 px-4"
      >
        <Text className="text-sm font-semibold text-blue-600">{label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`h-10 flex-row items-center justify-center rounded-full px-5 ${
        disabled ? "bg-orange-300" : "bg-[#FF641F]"
      }`}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          {action === "ACCEPT" && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
          <Text className={`text-sm font-semibold text-white ${action === "ACCEPT" ? "ml-1.5" : ""}`}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function OrderCard({
  order,
  now,
  busy,
  onAction,
  onView,
}: {
  order: OrderRow;
  now: number;
  busy: boolean;
  onAction: (action: OrderAction) => void;
  onView: () => void;
}) {
  const quantity = orderQuantityText(order);

  // PENDING orders carry a deadline: after it the backend refuses "accept".
  const remaining = order.status === "PENDING" ? formatRemaining(order.respondBy, now) : "";

  return (
    <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View className="mr-2 flex-1 flex-row items-center">
          <Text numberOfLines={1} className="mr-2 flex-shrink text-xs text-gray-400">
            #{order.orderNumber}
          </Text>
          <OrderStatusPill status={order.status} />
        </View>

        {!!order.createdAt && (
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={12} color="#9CA3AF" />
            <Text className="ml-1 text-xs text-gray-400">{timeAgo(order.createdAt)}</Text>
          </View>
        )}
      </View>

      <Text numberOfLines={2} className="mt-3 text-[15px] font-bold text-[#071226]">
        {orderTitle(order)}
      </Text>
      {!!quantity && <Text className="mt-0.5 text-xs text-gray-500">{quantity}</Text>}

      <View className="mt-3 flex-row items-end justify-between">
        <View className="mr-3 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold text-[#071226]">
            {order.customerName}
          </Text>
          {!!order.shortAddress && (
            <Text numberOfLines={1} className="mt-0.5 text-xs text-gray-500">
              {order.shortAddress}
            </Text>
          )}
        </View>

        <Text className="text-[17px] font-bold text-[#071226]">{formatPrice(order.total)}</Text>
      </View>

      {!!remaining && (
        <Text
          className={`mt-3 text-xs font-medium ${
            remaining === "Ended" ? "text-red-600" : "text-orange-600"
          }`}
        >
          {remaining === "Ended" ? "Response time has passed" : `Respond within ${remaining}`}
        </Text>
      )}

      {order.delivery?.riderName && (
        <View className="mt-3 flex-row items-center">
          <Ionicons name="bus-outline" size={14} color="#F97316" />
          <Text numberOfLines={1} className="ml-1.5 flex-1 text-xs text-gray-600">
            {order.delivery.riderName}
          </Text>
        </View>
      )}

      {order.status === "REJECTED" && !!order.rejectionReason && (
        <Text className="mt-3 text-xs text-red-600">Reason: {order.rejectionReason}</Text>
      )}

      <OrderActionBar order={order} now={now} busy={busy} onAction={onAction} onView={onView} />
    </View>
  );
}
