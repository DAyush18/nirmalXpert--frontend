import { create } from "zustand";

import { dealerApi } from "@/api/dealer.api";
import { errorMessage } from "@/lib/authFlow";
import { normalizeRider, normalizeRiders } from "@/lib/orders";
import type { Rider } from "@/types/orders";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface RidersState {
  status: LoadStatus;
  riders: Rider[];
  error: string | null;

  fetch: () => Promise<void>;
  upsert: (rider: Rider) => void;
  remove: (id: string) => void;
  reset: () => void;
}

let inflight: Promise<void> | null = null;

const byName = (a: Rider, b: Rider) => a.name.localeCompare(b.name);

export const useRidersStore = create<RidersState>((set, get) => ({
  status: "idle",
  riders: [],
  error: null,

  fetch: () => {
    if (inflight) return inflight;

    if (get().status !== "ready") set({ status: "loading", error: null });

    inflight = (async () => {
      try {
        const riders = normalizeRiders(await dealerApi.getRiders()).sort(byName);
        set({ riders, status: "ready", error: null });
      } catch (error) {
        console.error("Failed to load riders:", error);
        set((state) => ({
          status: state.riders.length > 0 ? "ready" : "error",
          error: errorMessage(error, "Unable to load your logistics partners."),
        }));
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  },

  upsert: (rider) =>
    set((state) => ({
      riders: [...state.riders.filter((r) => r.id !== rider.id), rider].sort(byName),
    })),

  remove: (id) => set((state) => ({ riders: state.riders.filter((r) => r.id !== id) })),

  reset: () => {
    inflight = null;
    set({ status: "idle", riders: [], error: null });
  },
}));

export { normalizeRider };
