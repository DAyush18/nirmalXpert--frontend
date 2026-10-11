import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";

import { errorMessage } from "@/lib/authFlow";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useInventoryStore } from "@/store/inventory.store";
import type { CatalogProduct } from "@/types/inventory";

/**
 * Step 1 of "+ Add Product": search the catalog and pick a product.
 * The backend searches product NAME only, so the search is remote (debounced).
 * Picking a product opens the shared form screen (edit/[productId]).
 */
export default function AddProductScreen() {
  const router = useRouter();
  const loadCatalog = useInventoryStore((state) => state.loadCatalog);

  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim(), 400);

  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ignore answers to searches the dealer has already moved past.
  const latest = useRef(0);

  const run = useCallback(
    async (text: string) => {
      const id = ++latest.current;

      try {
        setLoading(true);
        setError(null);

        const list = await loadCatalog(text || undefined);
        if (id === latest.current) setResults(list);
      } catch (err) {
        if (id === latest.current) setError(errorMessage(err, "Unable to load the catalog."));
      } finally {
        if (id === latest.current) setLoading(false);
      }
    },
    [loadCatalog],
  );

  useEffect(() => {
    run(search);
  }, [search, run]);

  const openProduct = (product: CatalogProduct) =>
    router.push(`/dealer/inventory/edit/${product.productId}` as Href);

  return (
    <SafeAreaView className="flex-1 bg-[#F7F8FA]">
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <Pressable onPress={() => router.back()} hitSlop={10} className="mr-2">
          <Ionicons name="chevron-back" size={24} color="#071226" />
        </Pressable>
        <Text className="text-[18px] font-bold text-[#071226]">Add Product</Text>
      </View>

      <View className="px-4 pb-3">
        <View className="flex-row items-center rounded-full border border-gray-200 bg-white px-4">
          <Ionicons name="search-outline" size={16} color="#9CA3AF" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search the catalog..."
            placeholderTextColor="#9CA3AF"
            autoCorrect={false}
            autoFocus
            className="ml-2 flex-1 py-3 text-sm text-[#111827]"
          />
          {query !== "" && (
            <Pressable hitSlop={10} onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(product: CatalogProduct) => product.productId}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 }}
        renderItem={({ item }: { item: CatalogProduct }) => (
          <ProductRow product={item} onPress={() => openProduct(item)} />
        )}
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : error ? (
            <View className="items-center px-6 py-12">
              <Text className="text-center text-base font-semibold text-gray-900">
                Unable to load the catalog
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-500">{error}</Text>
              <Pressable
                onPress={() => run(search)}
                className="mt-5 rounded-xl bg-[#FF641F] px-8 py-3"
              >
                <Text className="font-bold text-white">Try Again</Text>
              </Pressable>
            </View>
          ) : (
            <View className="items-center px-6 py-12">
              <Text className="text-center text-base font-semibold text-gray-900">
                No products found
              </Text>
              <Text className="mt-1 text-center text-sm text-gray-500">
                {search ? `Nothing in the catalog matches "${search}".` : "The catalog is empty."}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function ProductRow({ product, onPress }: { product: CatalogProduct; onPress: () => void }) {
  const details = [product.sku, product.brand].filter(Boolean).join(" · ");

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-gray-200 bg-white p-4"
    >
      <View className="mr-3 flex-1">
        <Text numberOfLines={2} className="text-[15px] font-bold text-[#071226]">
          {product.name}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-xs text-gray-500">
          {[details, product.categoryName].filter(Boolean).join(" · ")}
        </Text>
      </View>

      {product.inInventory ? (
        <View className="rounded-full bg-gray-100 px-3 py-1">
          <Text className="text-xs font-semibold text-gray-600">In inventory</Text>
        </View>
      ) : (
        <View className="rounded-full border border-[#FF641F] px-4 py-1.5">
          <Text className="text-xs font-semibold text-[#FF641F]">Add</Text>
        </View>
      )}
    </Pressable>
  );
}
