import { useMemo } from "react";

import { getDealerGate } from "@/lib/dealerFlow";
import { useDealerStore } from "@/store/dealer.store";

/** What the current dealer may do. Derived from the same gate that routes them. */
export function useDealerAccess() {
  const me = useDealerStore((state) => state.me);
  const fixedSteps = useDealerStore((state) => state.fixedSteps);

  return useMemo(() => {
    const gate = getDealerGate(me, fixedSteps);

    return {
      phase: gate.phase,
      canUseApp: gate.canUseApp,
      /** Bidding opens only after approval. */
      canBid: gate.canBid,
    };
  }, [me, fixedSteps]);
}
