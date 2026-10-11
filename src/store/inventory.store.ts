import { create } from "zustand";

import { dealerApi } from "@/api/dealer.api";
import { errorMessage } from "@/lib/authFlow";
import {
  normalizeCatalog,
  normalizeInventoryResponse,
  sortItems,
} from "@/lib/inventory";
import type {
  CatalogProduct,
  InventoryCounts,
  InventoryItem,
} from "@/types/inventory";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface InventoryState {
  status: LoadStatus;
  items: InventoryItem[];
  /** Only set if the backend ever sends counts; otherwise they are computed. */
  serverCounts: InventoryCounts | null;
  error: string | null;
  /** Catalog products seen so far, so the form screen can open without a refetch. */
  catalog: Record<string, CatalogProduct>;

  /** GET /dealer/inventory (single-flight; keeps showing old data while refreshing). */
  fetch: () => Promise<void>;
  /** GET /dealer/inventory/catalog?search=... (throws; the caller shows the error). */
  loadCatalog: (search?: string) => Promise<CatalogProduct[]>;
  /** Reflect a successful save immediately (the list refetches on focus anyway). */
  upsertItem: (item: InventoryItem) => void;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

export const useInventoryStore = create<InventoryState>((set, get) => ({
  status: "idle",
  items: [],
  serverCounts: null,
  error: null,
  catalog: {},

  fetch: () => {
    if (inflight) return inflight;

    // Only show the loading state the first time; later refreshes are silent.
    if (get().status !== "ready") set({ status: "loading", error: null });

    inflight = (async () => {
      try {
        const { items, counts } = normalizeInventoryResponse(await dealerApi.getInventory());
        set({ items, serverCounts: counts, status: "ready", error: null });
      } catch (error) {
        console.error("Failed to load inventory:", error);
        set((state) => ({
          // keep showing what we have; only a first load becomes an error screen
          status: state.items.length > 0 ? "ready" : "error",
          error: errorMessage(error, "Unable to load your inventory."),
        }));
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  },

  loadCatalog: async (search) => {
    const list = normalizeCatalog(await dealerApi.getInventoryCatalog(search));

    set((state) => ({
      catalog: {
        ...state.catalog,
        ...Object.fromEntries(list.map((product) => [product.productId, product])),
      },
    }));

    return list;
  },

  upsertItem: (item) =>
    set((state) => {
      const others = state.items.filter((existing) => existing.productId !== item.productId);
      const known = state.catalog[item.productId];

      return {
        items: sortItems([...others, item]),
        serverCounts: null, // stale until the next fetch
        catalog: known
          ? { ...state.catalog, [item.productId]: { ...known, inInventory: true } }
          : state.catalog,
      };
    }),

  reset: () => {
    inflight = null;
    set({ status: "idle", items: [], serverCounts: null, error: null, catalog: {} });
  },
}));
