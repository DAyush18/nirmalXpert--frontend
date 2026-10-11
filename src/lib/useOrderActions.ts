import { useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { dealerApi } from "@/api/dealer.api";
import { errorMessage } from "@/lib/authFlow";
import { normalizeOrder } from "@/lib/orders";
import { useOrdersStore } from "@/store/orders.store";
import type { OrderAction, OrderRow } from "@/types/orders";

/**
 * Every order action in one place, so the list and the detail screen behave the
 * same. After an action the order is re-read from the server (the source of
 * truth), the lists are refreshed, and any error is shown with the backend's text.
 */
export function useOrderActions() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const refreshOrder = async (id: string) => {
    const fresh = normalizeOrder(await dealerApi.getOrder(id));
    if (fresh) useOrdersStore.getState().replaceOrder(fresh);
    return fresh;
  };

  /** Runs one request. Returns true on success. */
  const run = useCallback(
    async (order: OrderRow, request: () => Promise<unknown>) => {
      if (busyId) return false;

      try {
        setBusyId(order.id);

        await request();
        await refreshOrder(order.id);

        const store = useOrdersStore.getState();
        void store.refreshLoaded(); // the order may now belong to another filter
        void store.fetchCounts();

        return true;
      } catch (error) {
        console.error("Order action failed:", error);
        Alert.alert("Unable to update order", errorMessage(error));

        // it may have changed under us (already accepted, deadline passed...)
        await refreshOrder(order.id).catch(() => undefined);
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [busyId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const confirm = (title: string, message: string, confirmText: string, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: confirmText, onPress: onConfirm },
    ]);

  const reject = useCallback(
    (order: OrderRow, reason: string) =>
      run(order, () => dealerApi.rejectOrder(order.id, reason)),
    [run],
  );

  /** Reject needs a reason, so the screen opens its own modal for that action. */
  const perform = useCallback(
    (order: OrderRow, action: Exclude<OrderAction, "REJECT">) => {
      switch (action) {
        case "ACCEPT":
          confirm("Accept order", `Accept ${order.orderNumber}?`, "Accept", () =>
            void run(order, () => dealerApi.acceptOrder(order.id)),
          );
          return;

        case "PREPARING":
          void run(order, () => dealerApi.markOrderPreparing(order.id));
          return;

        case "ASSIGN":
          router.push(`/dealer/orders/assign/${order.id}` as Href);
          return;

        case "MARK_OUT":
          // the backend allows ASSIGNED -> PICKED_UP, which also sets the order to OUT_FOR_DELIVERY
          void run(order, () => dealerApi.updateDeliveryStatus(order.id, "PICKED_UP"));
          return;

        case "MARK_DELIVERED":
          confirm(
            "Mark as delivered",
            "Cash on delivery payments for this order will be marked as paid.",
            "Mark delivered",
            () => void run(order, () => dealerApi.updateDeliveryStatus(order.id, "DELIVERED")),
          );
          return;
      }
    },
    [router, run], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { busyId, perform, reject };
}
