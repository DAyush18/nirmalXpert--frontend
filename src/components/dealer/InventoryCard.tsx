import { Pressable, Text, View } from "react-native";

import { formatCount, formatPrice } from "@/lib/dashboardFormat";
import { STATUS_LABEL } from "@/lib/inventory";
import type { InventoryItem, InventoryStatus } from "@/types/inventory";

// Full class names (not built dynamically) so NativeWind can see them.
export const STATUS_STYLE: Record<InventoryStatus, { pill: string; text: string }> = {
  ACTIVE: { pill: "bg-green-50", text: "text-green-600" },
  LOW_STOCK: { pill: "bg-orange-100", text: "text-orange-600" },
  OUT_OF_STOCK: { pill: "bg-red-100", text: "text-red-600" },
  CLEARANCE: { pill: "bg-orange-100", text: "text-orange-600" },
};

export function StatusBadge({ status }: { status: InventoryStatus }) {
  const style = STATUS_STYLE[status];

  return (
    <View className={`rounded-full px-3 py-1 ${style.pill}`}>
      <Text className={`text-xs font-semibold ${style.text}`}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

export function InventoryCard({
  item,
  onEdit,
}: {
  item: InventoryItem;
  onEdit: () => void;
}) {
  // "CEM-ULT-001 · UltraTech". SKU / brand only exist once the backend has them.
  const subtitle = [item.sku, item.brand].filter(Boolean).join(" · ") || item.categoryName;

  // On clearance the dealer sells at the clearance price (when one is set).
  const onSale = item.isClearance && item.clearancePrice != null;

  return (
    <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="mr-3 flex-1">
          <Text numberOfLines={2} className="text-[15px] font-bold text-[#071226]">
            {item.name}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-xs text-gray-500">
            {subtitle}
          </Text>
        </View>

        <StatusBadge status={item.status} />
      </View>

      <View className="mt-4 flex-row items-end justify-between">
        <View className="mr-3 flex-1 flex-row">
          <View className="mr-8">
            <Text className="text-xs text-gray-500">Stock</Text>
            <Text className="mt-1 text-[15px] font-semibold text-[#071226]">
              {formatCount(item.stock)}
              {item.unit ? ` ${item.unit}` : ""}
            </Text>
          </View>

          <View className="flex-shrink">
            <Text className="text-xs text-gray-500">Price</Text>
            <View className="mt-1 flex-row items-baseline">
              <Text className="text-[15px] font-semibold text-[#071226]">
                {formatPrice(onSale ? (item.clearancePrice as number) : item.price)}
              </Text>
              {onSale && (
                <Text className="ml-2 text-xs text-gray-400 line-through">
                  {formatPrice(item.price)}
                </Text>
              )}
            </View>
          </View>
        </View>

        <Pressable
          onPress={onEdit}
          hitSlop={6}
          className="rounded-full border border-[#FF641F] px-6 py-2"
        >
          <Text className="text-sm font-semibold text-[#FF641F]">Edit</Text>
        </Pressable>
      </View>
    </View>
  );
}
