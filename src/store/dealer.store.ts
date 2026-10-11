import { create } from "zustand";

import { dealerApi } from "@/api/dealer.api";
import {
  getDealerGate,
  isRejectedState,
  type DealerGate,
  type DealerMe,
  type StepKey,
} from "@/lib/dealerFlow";

type DealerStatus = "idle" | "loading" | "ready" | "error";

type FetchOptions = {
  /**
   * Wait for any in-flight request and then fetch again. Use after a mutation,
   * otherwise single-flight could hand back a response from *before* the save.
   */
  force?: boolean;
  /** Step the dealer just re-submitted (only matters while REJECTED). */
  fixed?: StepKey;
};

interface DealerState {
  status: DealerStatus;
  /** Last GET /dealer/me response. The only copy of dealer state in the app. */
  me: DealerMe | null;
  /** Rejected steps the dealer already corrected in this rejection round. */
  fixedSteps: StepKey[];
  error: string | null;

  fetch: (options?: FetchOptions) => Promise<DealerMe | null>;
  /** Refresh from the server and return where the dealer must go next. */
  completeStep: (step: StepKey) => Promise<DealerGate>;
  reset: () => void;
}

let inflight: Promise<DealerMe | null> | null = null;

export const useDealerStore = create<DealerState>((set, get) => ({
  status: "idle",
  me: null,
  fixedSteps: [],
  error: null,

  fetch: async ({ force = false, fixed }: FetchOptions = {}) => {
    if (inflight) {
      if (!force) return inflight;
      await inflight.catch(() => undefined);
    }

    if (!get().me) set({ status: "loading", error: null });

    const request = (async () => {
      try {
        const me = (await dealerApi.getMe()) as DealerMe;
        if (__DEV__) {
          console.log(
            "[dealer/me]",
            "status:", me?.profile?.verificationStatus,
            "| stage:", me?.stage,
            "| submittedAt:", me?.journey?.submittedAt ?? null,
          );
        }

        const stillRejected = isRejectedState(me);

        // One atomic update: data + fixed steps change together, so the
        // router never renders an in-between state.
        set((state) => ({
          me,
          status: "ready",
          error: null,
          fixedSteps: stillRejected
            ? Array.from(new Set([...state.fixedSteps, ...(fixed ? [fixed] : [])]))
            : [],
        }));

        return me;
      } catch (error) {
        console.error("Failed to load dealer state:", error);
        set((state) => ({
          // Keep routing on the last known state if we have one.
          status: state.me ? "ready" : "error",
          error: "Unable to reach the server. Check your connection and try again.",
        }));
        return null;
      } finally {
        inflight = null;
      }
    })();

    inflight = request;
    return request;
  },

  completeStep: async (step) => {
    const me = await get().fetch({ force: true, fixed: step });

    if (!me) {
      throw new Error(
        "Your changes were saved, but we could not refresh your application status. Please try again.",
      );
    }

    return getDealerGate(me, get().fixedSteps);
  },

  reset: () => {
    inflight = null;
    set({ status: "idle", me: null, fixedSteps: [], error: null });
  },
}));
