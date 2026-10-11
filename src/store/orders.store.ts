import { create } from "zustand";

import { dealerApi } from "@/api/dealer.api";
import { errorMessage } from "@/lib/authFlow";
import {
  countsFromByStatus,
  mergeById,
  normalizeOrdersResponse,
} from "@/lib/orders";
import type { OrderFilter, OrderRow, OrderStatus } from "@/types/orders";

const PAGE_SIZE = 20;
const STALE_MS = 30_000; // on focus, only refetch a list older than this

type LoadStatus = "idle" | "loading" | "ready" | "error";

export type OrderList = {
  items: OrderRow[];
  page: number;
  totalPages: number;
  total: number;
  status: LoadStatus;
  loadingMore: boolean;
  error: string | null;
  fetchedAt: number;
};

const EMPTY_LIST: OrderList = {
  items: [],
  page: 0,
  totalPages: 1,
  total: 0,
  status: "idle",
  loadingMore: false,
  error: null,
  fetchedAt: 0,
};

interface OrdersState {
  /** One list per filter chip (All, Pending, ...), each with its own pagination. */
  lists: Partial<Record<OrderFilter, OrderList>>;
  /** Chip counts (from the dashboard's orders.byStatus); null until loaded. */
  counts: Record<OrderFilter, number> | null;

  fetchFirst: (filter: OrderFilter, opts?: { ifStale?: boolean }) => Promise<void>;
  fetchMore: (filter: OrderFilter) => Promise<void>;
  fetchCounts: () => Promise<void>;
  /** Refetch page 1 of every list that has been opened (after an order changed). */
  refreshLoaded: () => Promise<void>;
  /** Put an updated order into every list that contains it. */
  replaceOrder: (order: OrderRow) => void;
  reset: () => void;
}

const inflightFirst = new Map<OrderFilter, Promise<void>>();
const inflightMore = new Set<OrderFilter>();

const statusParam = (filter: OrderFilter): OrderStatus | undefined =>
  filter === "ALL" ? undefined : filter;

export const useOrdersStore = create<OrdersState>((set, get) => ({
  lists: {},
  counts: null,

  fetchFirst: (filter, opts) => {
    const running = inflightFirst.get(filter);
    if (running) return running;

    const current = get().lists[filter];
    if (opts?.ifStale && current?.status === "ready" && Date.now() - current.fetchedAt < STALE_MS) {
      return Promise.resolve();
    }

    // The loading state only shows the first time; later refreshes are silent.
    if (!current || current.status !== "ready") {
      set((state) => ({
        lists: { ...state.lists, [filter]: { ...(current ?? EMPTY_LIST), status: "loading", error: null } },
      }));
    }

    const request = (async () => {
      try {
        const page = normalizeOrdersResponse(
          await dealerApi.getOrders({ status: statusParam(filter), page: 1, limit: PAGE_SIZE }),
        );

        set((state) => ({
          lists: {
            ...state.lists,
            [filter]: {
              items: page.items,
              page: page.page,
              totalPages: page.totalPages,
              total: page.total,
              status: "ready",
              loadingMore: false,
              error: null,
              fetchedAt: Date.now(),
            },
          },
        }));
      } catch (error) {
        console.error("Failed to load orders:", error);

        set((state) => {
          const existing = state.lists[filter] ?? EMPTY_LIST;

          return {
            lists: {
              ...state.lists,
              [filter]: {
                ...existing,
                // keep showing what we have; only a first load becomes an error screen
                status: existing.items.length > 0 ? "ready" : "error",
                loadingMore: false,
                error: errorMessage(error, "Unable to load orders."),
              },
            },
          };
        });
      } finally {
        inflightFirst.delete(filter);
      }
    })();

    inflightFirst.set(filter, request);
    return request;
  },

  fetchMore: async (filter) => {
    const list = get().lists[filter];
    if (!list || list.status !== "ready" || list.loadingMore) return;
    if (list.page >= list.totalPages || inflightMore.has(filter)) return;

    inflightMore.add(filter);
    set((state) => ({ lists: { ...state.lists, [filter]: { ...list, loadingMore: true } } }));

    try {
      const page = normalizeOrdersResponse(
        await dealerApi.getOrders({ status: statusParam(filter), page: list.page + 1, limit: PAGE_SIZE }),
      );

      set((state) => {
        const latest = state.lists[filter] ?? list;

        return {
          lists: {
            ...state.lists,
            [filter]: {
              ...latest,
              items: mergeById(latest.items, page.items),
              page: page.page,
              totalPages: page.totalPages,
              total: page.total,
              loadingMore: false,
              error: null,
            },
          },
        };
      });
    } catch (error) {
      console.error("Failed to load more orders:", error);

      set((state) => ({
        lists: {
          ...state.lists,
          [filter]: {
            ...(state.lists[filter] ?? list),
            loadingMore: false,
            error: errorMessage(error, "Unable to load more orders."),
          },
        },
      }));
    } finally {
      inflightMore.delete(filter);
    }
  },

  fetchCounts: async () => {
    try {
      const dashboard = await dealerApi.getDashboard();
      const counts = countsFromByStatus(dashboard?.orders?.byStatus);
      if (counts) set({ counts });
    } catch {
      // counts are decoration; the chips just show no numbers
    }
  },

  refreshLoaded: async () => {
    const filters = Object.keys(get().lists) as OrderFilter[];
    await Promise.all(filters.map((filter) => get().fetchFirst(filter)));
  },

  replaceOrder: (order) =>
    set((state) => {
      const lists: Partial<Record<OrderFilter, OrderList>> = {};

      for (const filter of Object.keys(state.lists) as OrderFilter[]) {
        const list = state.lists[filter];

        if (list) {
          lists[filter] = {
            ...list,
            items: list.items.map((existing) => (existing.id === order.id ? order : existing)),
          };
        }
      }

      return { lists };
    }),

  reset: () => {
    inflightFirst.clear();
    inflightMore.clear();
    set({ lists: {}, counts: null });
  },
}));

/** Find an order in whichever list has it. */
export function findOrder(
  lists: Partial<Record<OrderFilter, OrderList>>,
  id: string | undefined,
): OrderRow | undefined {
  if (!id) return undefined;

  for (const list of Object.values(lists) as (OrderList | undefined)[]) {
    const found = list?.items.find((order) => order.id === id);
    if (found) return found;
  }

  return undefined;
}
