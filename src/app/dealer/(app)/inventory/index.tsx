import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    SafeAreaView,
    Text,
    TextInput,
    View,
} from "react-native";

import { InventoryCard } from "@/components/dealer/InventoryCard";
import { FilterPill, PickerModal } from "@/components/dealer/InventoryFilters";
import { VerificationBanner } from "@/components/dealer/VerificationBanner";
import {
    computeCounts,
    deriveCategories,
    filterInventory,
    hasActiveFilters,
    NO_FILTERS,
    STATUS_FILTERS,
} from "@/lib/inventory";
import { useInventoryStore } from "@/store/inventory.store";
import type { InventoryFilters, InventoryItem } from "@/types/inventory";

const ALL_CATEGORIES = "ALL";

export default function InventoryScreen() {
  const router = useRouter();

  const status = useInventoryStore((state) => state.status);
  const items = useInventoryStore((state) => state.items);
  const serverCounts = useInventoryStore((state) => state.serverCounts);
  const error = useInventoryStore((state) => state.error);
  const fetchInventory = useInventoryStore((state) => state.fetch);

  const [filters, setFilters] = useState<InventoryFilters>(NO_FILTERS);
  const [picker, setPicker] = useState<"category" | "status" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh whenever the tab / screen gains focus (e.g. coming back from add / edit).
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  };

  const categories = useMemo(() => deriveCategories(items), [items]);
  const visible = useMemo(
    () => filterInventory(items, filters),
    [items, filters],
  );
  const counts = useMemo(
    () => serverCounts ?? computeCounts(items),
    [serverCounts, items],
  );

  const categoryLabel =
    categories.find((category) => category.id === filters.categoryId)?.name ??
    "All Categories";
  const statusLabel =
    STATUS_FILTERS.find((option) => option.value === filters.status)?.label ??
    "All Status";

  const openAdd = () => router.push("/dealer/inventory/add-product" as Href);
  const openEdit = (item: InventoryItem) =>
    router.push(`/dealer/inventory/edit/${item.productId}` as Href);

  const loadingFirst = status === "loading" || status === "idle";
  const failedFirst = status === "error" && items.length === 0;

  const header = (
    <View>
      <VerificationBanner compact />

      {/* Search + dropdowns */}
      <View className="mb-3 rounded-2xl border border-gray-200 bg-white p-3">
        <View className="flex-row items-center rounded-full border border-gray-200 bg-[#F8FAFC] px-4">
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            value={filters.query}
            onChangeText={(query: string) =>
              setFilters((current) => ({ ...current, query }))
            }
            placeholder="Search products, brands..."
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            autoCorrect={false}
            className="ml-2 flex-1 py-3 text-sm text-[#111827]"
          />
          {filters.query !== "" && (
            <Pressable
              hitSlop={10}
              onPress={() =>
                setFilters((current) => ({ ...current, query: "" }))
              }
            >
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        <View className="mt-3 flex-row gap-2">
          <FilterPill
            label={categoryLabel}
            active={filters.categoryId !== null}
            onPress={() => setPicker("category")}
          />
          <FilterPill
            label={statusLabel}
            active={filters.status !== "ALL"}
            onPress={() => setPicker("status")}
          />
        </View>
      </View>

      {/* Summary */}
      {status === "ready" && (
        <View className="mb-3 flex-row flex-wrap gap-2">
          <Chip
            label={`Total: ${counts.total}`}
            pill="bg-slate-100"
            text="text-slate-600"
          />
          <Chip
            label={`Active: ${counts.active}`}
            pill="bg-green-50"
            text="text-green-600"
          />
          <Chip
            label={`Low Stock: ${counts.lowStock}`}
            pill="bg-orange-100"
            text="text-orange-600"
          />
          <Chip
            label={`Out of Stock: ${counts.outOfStock}`}
            pill="bg-red-100"
            text="text-red-600"
          />
          <Chip
            label={`Clearance: ${counts.clearance}`}
            pill="bg-orange-100"
            text="text-orange-600"
          />
        </View>
      )}

      <AddButton onPress={openAdd} />

      {error && items.length > 0 && (
        <Text className="mb-3 text-center text-xs text-red-600">
          Could not refresh: {error}
        </Text>
      )}
    </View>
  );

  const empty = loadingFirst ? (
    <Skeleton />
  ) : failedFirst ? (
    <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
      <Text className="text-center text-base font-semibold text-gray-900">
        Unable to load your inventory
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500">{error}</Text>
      <Pressable
        onPress={() => fetchInventory()}
        className="mt-5 rounded-xl bg-[#FF641F] px-8 py-3"
      >
        <Text className="font-bold text-white">Try Again</Text>
      </Pressable>
    </View>
  ) : items.length === 0 ? (
    <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
      <Ionicons name="cube-outline" size={36} color="#9CA3AF" />
      <Text className="mt-3 text-center text-base font-semibold text-gray-900">
        No products in your inventory
      </Text>
      <Text className="mt-1 text-center text-sm text-gray-500">
        Add products from the catalog to start selling.
      </Text>
      <Pressable
        onPress={openAdd}
        className="mt-5 rounded-xl bg-[#071226] px-8 py-3"
      >
        <Text className="font-bold text-white">+ Add Product</Text>
      </Pressable>
    </View>
  ) : (
    <View className="items-center rounded-2xl border border-gray-200 bg-white px-6 py-10">
      <Text className="text-center text-base font-semibold text-gray-900">
        No products found
      </Text>
      <Text className="mt-1 text-center text-sm text-gray-500">
        Nothing matches your search or filters.
      </Text>
      {hasActiveFilters(filters) && (
        <Pressable
          onPress={() => setFilters(NO_FILTERS)}
          className="mt-5 rounded-xl border border-[#FF641F] px-6 py-3"
        >
          <Text className="font-bold text-[#FF641F]">
            Clear search and filters
          </Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <FlatList
        data={visible}
        keyExtractor={(item: InventoryItem) => item.productId}
        renderItem={({ item }: { item: InventoryItem }) => (
          <InventoryCard item={item} onEdit={() => openEdit(item)} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
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

      <PickerModal
        visible={picker === "category"}
        title="Category"
        selected={filters.categoryId ?? ALL_CATEGORIES}
        options={[
          { value: ALL_CATEGORIES, label: "All Categories" },
          ...categories.map((category) => ({
            value: category.id,
            label: category.name,
          })),
        ]}
        onSelect={(value: string) =>
          setFilters((current) => ({
            ...current,
            categoryId: value === ALL_CATEGORIES ? null : value,
          }))
        }
        onClose={() => setPicker(null)}
      />

      <PickerModal
        visible={picker === "status"}
        title="Status"
        selected={filters.status}
        options={STATUS_FILTERS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onSelect={(value: string) =>
          setFilters((current) => ({
            ...current,
            status: value as InventoryFilters["status"],
          }))
        }
        onClose={() => setPicker(null)}
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  pill,
  text,
}: {
  label: string;
  pill: string;
  text: string;
}) {
  return (
    <View className={`rounded-full px-3 py-1.5 ${pill}`}>
      <Text className={`text-xs font-medium ${text}`}>{label}</Text>
    </View>
  );
}

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center justify-center rounded-full bg-[#071226] py-3.5"
    >
      <Ionicons name="add" size={18} color="#FFFFFF" />
      <Text className="ml-1 text-sm font-bold text-white">Add Product</Text>
    </Pressable>
  );
}

/** Placeholder cards while the first load is running (never "No products" yet). */
function Skeleton() {
  return (
    <View>
      <View className="mb-3 items-center py-2">
        <ActivityIndicator color="#F97316" />
      </View>

      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          className="mb-3 rounded-2xl border border-gray-200 bg-white p-4"
        >
          <View className="flex-row justify-between">
            <View className="h-4 w-2/3 rounded bg-gray-200" />
            <View className="h-5 w-16 rounded-full bg-gray-200" />
          </View>
          <View className="mt-2 h-3 w-1/3 rounded bg-gray-100" />
          <View className="mt-5 flex-row items-end justify-between">
            <View className="flex-row">
              <View className="mr-8">
                <View className="h-3 w-10 rounded bg-gray-100" />
                <View className="mt-2 h-4 w-16 rounded bg-gray-200" />
              </View>
              <View>
                <View className="h-3 w-10 rounded bg-gray-100" />
                <View className="mt-2 h-4 w-14 rounded bg-gray-200" />
              </View>
            </View>
            <View className="h-9 w-20 rounded-full bg-gray-100" />
          </View>
        </View>
      ))}
    </View>
  );
}
