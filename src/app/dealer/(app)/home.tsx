import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { VerificationBanner } from "@/components/dealer/VerificationBanner";
import {
    changeText,
    formatCompactINR,
    formatDateLine,
    formatINR,
    formatRemaining,
    marketText,
    padCount,
    timeAgo,
} from "@/lib/dashboardFormat";
import {
    normalizeBid,
    normalizeOrder,
    type BidRow,
    type OrderRow,
} from "@/lib/dashboardRows";
import { useDealerAccess } from "@/lib/useDealerAccess";
import type { DashboardData } from "@/types/dashboard";

type IconName = keyof typeof Ionicons.glyphMap;
type Tone = "green" | "red" | "muted";

// Full class names (not built dynamically) so NativeWind can see them.
const TONE_TEXT: Record<Tone, string> = {
  green: "text-green-600",
  red: "text-red-500",
  muted: "text-gray-500",
};
const TONE_ICON: Record<Tone, string> = {
  green: "#16A34A",
  red: "#EF4444",
  muted: "#6B7280",
};

const ORDER_STATUS: Record<
  string,
  { label: string; pill: string; text: string }
> = {
  PENDING: { label: "Pending", pill: "bg-orange-50", text: "text-orange-600" },
  ACCEPTED: { label: "Accepted", pill: "bg-blue-50", text: "text-blue-600" },
  PREPARING: {
    label: "Processing",
    pill: "bg-purple-50",
    text: "text-purple-600",
  },
  OUT_FOR_DELIVERY: {
    label: "On the way",
    pill: "bg-purple-50",
    text: "text-purple-600",
  },
  DELIVERED: {
    label: "Delivered",
    pill: "bg-green-50",
    text: "text-green-600",
  },
  REJECTED: { label: "Rejected", pill: "bg-red-50", text: "text-red-600" },
  EXPIRED: { label: "Expired", pill: "bg-gray-100", text: "text-gray-600" },
  CANCELLED: { label: "Cancelled", pill: "bg-gray-100", text: "text-gray-600" },
};

const BID_STATE = {
  ACTIVE: { label: "Active", pill: "bg-blue-50", text: "text-blue-600" },
  WINNING: { label: "Winning", pill: "bg-green-50", text: "text-green-600" },
  OUTBID: { label: "Outbid", pill: "bg-red-50", text: "text-red-600" },
} as const;

const comingSoon = (title: string) =>
  Alert.alert(title, "This section is coming soon.");

export default function DealerDashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { canBid } = useDealerAccess();

  const load = useCallback(async (mode: "initial" | "refresh") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      setData((await dealerApi.getDashboard()) as DashboardData);
    } catch (err) {
      console.error("Failed to load dashboard:", err);

      setError(
        isAxiosError(err)
          ? err.response?.data?.message ||
              `Request failed (${err.response?.status ?? "network error"}).`
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load("initial");
  }, [load]);

  const orders = useMemo(
    () => (data?.recentOrders ?? []).map((o, i) => normalizeOrder(o, i)),
    [data],
  );
  const bids = useMemo(
    () => (data?.activeBids ?? []).map((b, i) => normalizeBid(b, i)),
    [data],
  );

  // Tick every second only while there are bids with a countdown.
  const now = useNow(bids.some((bid) => !!bid.endsAt));

  if (loading && !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F8FA]">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-4 text-sm text-gray-500">
          Loading your dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F7F8FA] px-6">
        <Text className="text-center text-lg font-semibold text-gray-900">
          Unable to load your dashboard
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500">{error}</Text>
        <Pressable
          onPress={() => load("initial")}
          className="mt-6 rounded-xl bg-[#FF641F] px-8 py-4"
        >
          <Text className="font-bold text-white">Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { header, stats, inventoryAlerts, pendingOrders } = data;

  const place = [header.city, header.state].filter(Boolean).join(", ");
  const dateLine = [
    formatDateLine(new Date(header.generatedAt)),
    place,
    marketText(header.market),
  ]
    .filter(Boolean)
    .join(" · ");

  const revenueChange = changeText(stats.revenue.changePercent);
  const revenueTone: Tone =
    stats.revenue.changePercent == null
      ? "muted"
      : stats.revenue.changePercent >= 0
        ? "green"
        : "red";

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load("refresh")}
            tintColor="#F97316"
            colors={["#F97316"]}
          />
        }
      >
        {/* Header */}
        <Text className="text-[22px] font-bold text-[#071226]">
          Welcome back, {header.businessName}
        </Text>

        <Text className="mt-1 text-xs text-gray-500">{dateLine}</Text>

        <VerificationBanner />

        <Pressable
          onPress={() =>
            canBid
              ? comingSoon("Create Live Bid")
              : Alert.alert(
                  "Bidding is locked",
                  "You can start bidding once your account is approved.",
                )
          }
          className={`mt-4 flex-row items-center justify-center rounded-xl py-3.5 ${
            canBid ? "bg-[#FF641F]" : "bg-gray-300"
          }`}
        >
          <Ionicons
            name={canBid ? "flash-outline" : "lock-closed-outline"}
            size={16}
            color="#FFFFFF"
          />
          <Text className="ml-2 font-bold text-white">
            {canBid ? "Create Live Bid" : "Bidding opens after approval"}
          </Text>
        </Pressable>

        {data.bidding.openOpportunities > 0 && (
          <Text className="mt-2 text-center text-xs text-gray-500">
            {data.bidding.openOpportunities} open bidding opportunities
          </Text>
        )}

        {error && (
          <Text className="mt-3 text-center text-xs text-red-600">
            Could not refresh: {error}
          </Text>
        )}

        {/* Orders waiting for the dealer's response */}
        {pendingOrders.count > 0 && (
          <View className="mt-4 flex-row items-center rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <Ionicons name="time-outline" size={20} color="#EA580C" />
            <Text className="ml-3 flex-1 text-sm font-semibold text-orange-700">
              {pendingOrders.count} order{pendingOrders.count === 1 ? "" : "s"}{" "}
              waiting for your response
            </Text>
          </View>
        )}

        {/* Stat cards */}
        <View className="mt-4 flex-row flex-wrap justify-between">
          <StatCard
            icon="cube-outline"
            iconColor="#3B82F6"
            iconBg="bg-blue-50"
            value={String(stats.totalProducts.value)}
            label="Total Products"
            sub={`+${stats.totalProducts.addedThisWeek} this week`}
            tone="green"
          />
          <StatCard
            icon="grid-outline"
            iconColor="#16A34A"
            iconBg="bg-green-50"
            value={stats.activeInventory.units.toLocaleString("en-IN")}
            label="Active Inventory"
            sub="units in stock"
            tone="green"
          />
          <StatCard
            icon="cart-outline"
            iconColor="#9333EA"
            iconBg="bg-purple-50"
            value={String(stats.ordersReceived.total)}
            label="Orders Received"
            sub={`+${stats.ordersReceived.today} today`}
            tone="green"
          />
          <StatCard
            icon="car-outline"
            iconColor="#2563EB"
            iconBg="bg-blue-50"
            value={String(stats.ordersDelivered.total)}
            label="Orders Delivered"
            sub={`+${stats.ordersDelivered.thisWeek} this week`}
            tone="green"
          />
          <StatCard
            icon="trending-up-outline"
            iconColor="#F97316"
            iconBg="bg-orange-50"
            value={formatCompactINR(stats.revenue.month)}
            label="Revenue Generated"
            sub={
              revenueChange ?? `Today ${formatCompactINR(stats.revenue.today)}`
            }
            tone={revenueTone}
          />
          <StatCard
            icon="hammer-outline"
            iconColor="#F97316"
            iconBg="bg-orange-50"
            value={padCount(stats.activeBids.count)}
            label="Active Bids Today"
            sub={`${stats.activeBids.winning} winning`}
            tone="green"
          />
          <StatCard
            icon="alert-circle-outline"
            iconColor="#EF4444"
            iconBg="bg-red-50"
            value={String(stats.clearance.products)}
            label="Clearance Products"
            sub={`${formatCompactINR(stats.clearance.value)} value`}
            tone="red"
          />
        </View>

        {/* Recent orders */}
        <Card
          title="Recent Orders"
          action="View all"
          onAction={() => comingSoon("Orders")}
        >
          {orders.length === 0 ? (
            <Empty text="No orders yet. New orders will show up here." />
          ) : (
            orders.map((order, index) => (
              <OrderItem
                key={order.id}
                order={order}
                last={index === orders.length - 1}
              />
            ))
          )}
        </Card>

        {/* Active bids */}
        <Card
          title="Active Bids"
          badge="Live"
          action="Live Market"
          onAction={() => comingSoon("Live Market")}
        >
          {bids.length === 0 ? (
            <Empty text="No active bids right now." />
          ) : (
            bids.map((bid, index) => (
              <BidItem
                key={bid.id}
                bid={bid}
                now={now}
                last={index === bids.length - 1}
              />
            ))
          )}
        </Card>

        {/* Inventory alerts */}
        <View className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
          <Text className="text-[17px] font-bold text-[#111827]">
            Inventory Alerts
          </Text>

          <View className="mt-3 flex-row gap-2">
            <AlertTile
              icon="alert-circle-outline"
              iconBg="bg-red-50"
              iconColor="#EF4444"
              textColor="text-red-500"
              label="Out of Stock"
              count={inventoryAlerts.outOfStock}
            />
            <AlertTile
              icon="layers-outline"
              iconBg="bg-orange-50"
              iconColor="#F97316"
              textColor="text-orange-500"
              label="Low Stock"
              count={inventoryAlerts.lowStock}
            />
            <AlertTile
              icon="trending-up-outline"
              iconBg="bg-purple-50"
              iconColor="#9333EA"
              textColor="text-purple-600"
              label="Clearance"
              count={inventoryAlerts.clearance}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return now;
}

function StatCard({
  icon,
  iconColor,
  iconBg,
  value,
  label,
  sub,
  tone,
}: {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
  sub: string;
  tone: Tone;
}) {
  return (
    <View className="mb-3 w-[48.5%] rounded-2xl border border-gray-200 bg-white p-4">
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <Text className="mt-3 text-[26px] font-bold text-[#071226]">{value}</Text>
      <Text className="text-xs text-gray-500">{label}</Text>

      <View className="mt-1.5 flex-row items-center">
        <Ionicons
          name={
            tone === "red" ? "trending-down-outline" : "trending-up-outline"
          }
          size={12}
          color={TONE_ICON[tone]}
        />
        <Text className={`ml-1 flex-1 text-xs font-medium ${TONE_TEXT[tone]}`}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

function Card({
  title,
  badge,
  action,
  onAction,
  children,
}: {
  title: string;
  badge?: string;
  action: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-1 mb-3 rounded-2xl border border-gray-200 bg-white">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-3.5">
        <View className="flex-row items-center">
          <Text className="text-[17px] font-bold text-[#111827]">{title}</Text>

          {badge && (
            <View className="ml-2 rounded-full bg-red-500 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-white">{badge}</Text>
            </View>
          )}
        </View>

        <Pressable onPress={onAction} hitSlop={8}>
          <Text className="text-sm font-semibold text-[#FF641F]">{action}</Text>
        </Pressable>
      </View>

      <View className="px-4">{children}</View>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text className="py-8 text-center text-sm text-gray-500">{text}</Text>;
}

function OrderItem({ order, last }: { order: OrderRow; last: boolean }) {
  const status = ORDER_STATUS[order.status];

  return (
    <View className={`py-4 ${last ? "" : "border-b border-gray-100"}`}>
      <View className="flex-row items-center">
        {!!order.number && (
          <Text className="text-xs text-gray-400">#{order.number}</Text>
        )}

        {status && (
          <View className={`ml-2 rounded-md px-2 py-0.5 ${status.pill}`}>
            <Text className={`text-[10px] font-semibold ${status.text}`}>
              {status.label}
            </Text>
          </View>
        )}
      </View>

      <View className="mt-1.5 flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-[15px] font-bold text-[#111827]">
            {order.title}
          </Text>
          {!!order.detail && (
            <Text className="mt-0.5 text-xs text-gray-500">{order.detail}</Text>
          )}
        </View>

        <View className="items-end">
          <Text className="text-[15px] font-bold text-[#111827]">
            {formatINR(order.amount)}
          </Text>
          {!!order.createdAt && (
            <Text className="mt-0.5 text-xs text-gray-400">
              {timeAgo(order.createdAt)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function BidItem({
  bid,
  now,
  last,
}: {
  bid: BidRow;
  now: number;
  last: boolean;
}) {
  const state = BID_STATE[bid.state];
  const remaining = formatRemaining(bid.endsAt, now);
  const urgent = bid.state === "OUTBID";

  return (
    <View className={`py-4 ${last ? "" : "border-b border-gray-100"}`}>
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <View className="flex-row items-center">
            <Text className="flex-shrink text-[15px] font-bold text-[#111827]">
              {bid.title}
            </Text>

            <View className={`ml-2 rounded-md px-2 py-0.5 ${state.pill}`}>
              <Text className={`text-[10px] font-semibold ${state.text}`}>
                {state.label}
              </Text>
            </View>
          </View>

          {!!bid.detail && (
            <Text className="mt-0.5 text-xs text-gray-500">{bid.detail}</Text>
          )}
        </View>

        <View className="items-end">
          <Text className="text-[10px] text-gray-400">My bid</Text>
          {bid.myBid != null && (
            <Text className="text-[15px] font-bold text-[#111827]">
              {formatINR(bid.myBid)}
            </Text>
          )}
          {bid.lowest != null && (
            <Text className="mt-0.5 text-xs text-gray-400">
              Lowest: {formatINR(bid.lowest)}
            </Text>
          )}
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        {!!remaining && (
          <View className="flex-row items-center">
            <Ionicons
              name="time-outline"
              size={13}
              color={urgent ? "#EF4444" : "#9CA3AF"}
            />
            <Text
              className={`ml-1 text-xs ${urgent ? "font-semibold text-red-500" : "text-gray-500"}`}
            >
              {remaining} remaining
            </Text>
          </View>
        )}

        {bid.state === "WINNING" && (
          <Text className="text-xs font-medium text-green-600">
            You're leading!
          </Text>
        )}
        {bid.state === "OUTBID" && (
          <Text className="text-xs font-medium text-red-500">
            Lower your price
          </Text>
        )}
      </View>
    </View>
  );
}

function AlertTile({
  icon,
  iconBg,
  iconColor,
  textColor,
  label,
  count,
}: {
  icon: IconName;
  iconBg: string;
  iconColor: string;
  textColor: string;
  label: string;
  count: number;
}) {
  return (
    <View className="flex-1 items-center rounded-2xl border border-gray-200 px-2 py-3">
      <View
        className={`h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>

      <Text className="mt-2 text-center text-[10px] text-gray-600">
        {label}
      </Text>
      <Text className={`mt-0.5 text-center text-xs font-bold ${textColor}`}>
        {count} product{count === 1 ? "" : "s"}
      </Text>
    </View>
  );
}
