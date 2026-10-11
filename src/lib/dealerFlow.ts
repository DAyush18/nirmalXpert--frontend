/**
 * Single source of truth for "where should this dealer be right now?"
 *
 * Pure functions only: no React, no router, no API calls. Everything that
 * decides routing (dealer layout, step screens, pending / rejected screens)
 * goes through getDealerGate(), so there is exactly one place to change when
 * the backend response changes.
 *
 * INPUT  = the GET /dealer/me response (+ steps the dealer already corrected
 *          locally during a rejection round).
 * OUTPUT = phase, the one route the dealer must be on, and which paths are legal.
 *
 * Backend contract used (confirmed against a real response):
 *   profile.verificationStatus   PENDING | APPROVED | REJECTED
 *   steps                        { basic, verification, documents, location }  booleans
 *   missing[]                    { step, label }
 *   canSubmit                    boolean
 *   journey.submittedAt          ISO string | null
 *   issues[]                     { type, reason }       (reviewer feedback)
 *   documents[]                  { type, required, status, rejectionReason }
 */

export type VerificationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type StepKey = "basic" | "verification" | "contact";
export type StepState = "COMPLETE" | "INCOMPLETE" | "REJECTED";
export type DealerPhase = "ONBOARDING" | "PENDING" | "REJECTED" | "APPROVED";

export type DealerIssue = { type?: string; reason?: string };

export type DealerDocument = {
  type: string;
  required?: boolean;
  status: "MISSING" | "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
};

export type DealerMissing = { step?: string; label?: string };

export type DealerMe = {
  stage?: string;
  steps?: Partial<Record<"basic" | "verification" | "documents" | "location", boolean>>;
  missing?: DealerMissing[] | unknown;
  canSubmit?: boolean;
  journey?: { submittedAt?: string | null; underReview?: boolean; approved?: boolean };
  profile?: { verificationStatus?: VerificationStatus; [key: string]: unknown };
  issues?: DealerIssue[];
  documents?: DealerDocument[];
  [key: string]: unknown;
};

export type DealerGate = {
  phase: DealerPhase;
  /** The one route the dealer must be on right now. */
  route: string;
  /** Exact paths the dealer may be on (ignored when phase === APPROVED). */
  allowedPaths: string[];
  steps: Record<StepKey, StepState>;
  /** First step that still needs work (null when nothing is left). */
  currentStep: StepKey | null;
  /** Every step that still needs work, in order. */
  todoSteps: StepKey[];
  /** First-time dealer finished every step but has not pressed Submit yet. */
  readyToSubmit: boolean;
  /** REJECTED and every rejected step was corrected: show "Resubmit". */
  needsResubmit: boolean;
  /** REJECTED but we cannot tell which step: let the dealer pick. */
  manualFix: boolean;
  /** Dashboard, inventory, orders, logistics: APPROVED, and PENDING after submitting. */
  canUseApp: boolean;
  /** Bidding opens only after approval. */
  canBid: boolean;
};

type BaseGate = Omit<DealerGate, "canUseApp" | "canBid">;

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const STEP_ROUTES: Record<StepKey, string> = {
  basic: "/dealer/onboarding/basic-info",
  verification: "/dealer/onboarding/business-verification",
  contact: "/dealer/onboarding/contact-location",
};

// The status hub: shows PENDING, or the rejection reasons + what to fix.
// (APPROVED dealers never see it; they go straight to the dashboard.)
export const PENDING_ROUTE = "/dealer/onboarding/verification-pending";
export const HOME_ROUTE = "/dealer/home";

export const STEP_ORDER: StepKey[] = ["basic", "verification", "contact"];

export const DOCUMENT_LABELS: Record<string, string> = {
  PAN: "PAN Document",
  GST: "GST Certificate",
  BUSINESS_PROOF: "Business Proof",
  SHOP_LICENSE: "Shop License",
  INCORPORATION_CERT: "Incorporation Certificate",
  ADDRESS_PROOF: "Address Proof",
  MSME: "MSME Certificate",
};

// ---------------------------------------------------------------------------
// Mapping between the backend's step names and our screens
// ---------------------------------------------------------------------------

// One screen (business-verification) covers both "verification" and "documents".
const SERVER_STEPS: Record<StepKey, string[]> = {
  basic: ["basic"],
  verification: ["verification", "documents"],
  contact: ["location"],
};

const SERVER_TO_STEP: Record<string, StepKey> = {
  basic: "basic",
  verification: "verification",
  documents: "verification",
  location: "contact",
};

const DOC_TYPES = new Set(Object.keys(DOCUMENT_LABELS));

// Reviewer feedback (issues[]) has no step field, only free text, so we classify it.
const MATCHERS: Array<[StepKey, RegExp]> = [
  [
    "verification",
    /\b(pan|gst|gstin|cin|msme|business type|authori[sz]ed person|licen[sc]e|certificate|incorporation|proof|document)\b/,
  ],
  [
    "basic",
    /\b(business name|legal name|display name|employees?|years in business|categor(?:y|ies)|logo|cover)\b/,
  ],
  [
    "contact",
    /\b(address|city|state|pincode|pin code|location|latitude|longitude|delivery|contact|email|phone|photo)\b/,
  ],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "yearsInBusiness" / "years_in_business" -> "years in business" */
function toWords(text: string) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .toLowerCase()
    .trim();
}

/** Which onboarding step does this free text belong to? */
export function classifyText(text: string): StepKey | null {
  const raw = text.trim();
  if (!raw) return null;
  if (DOC_TYPES.has(raw.toUpperCase())) return "verification";

  const words = toWords(raw);
  for (const [step, pattern] of MATCHERS) {
    if (pattern.test(words)) return step;
  }
  return null;
}

export function classifyIssue(issue: DealerIssue): StepKey | null {
  if (/doc/i.test(issue.type ?? "")) return "verification";
  return classifyText(issue.reason ?? "");
}

function normalizeStatus(value: unknown): VerificationStatus {
  const status = String(value ?? "PENDING").toUpperCase();
  return status === "APPROVED" || status === "REJECTED" ? status : "PENDING";
}

/**
 * Rejected = the admin rejected the profile OR any document. The backend reports
 * that as stage ACTION_REQUIRED, even while verificationStatus is still PENDING
 * (a rejected document alone does not change verificationStatus).
 */
export function isRejectedState(me: DealerMe | null | undefined) {
  return (
    normalizeStatus(me?.profile?.verificationStatus) === "REJECTED" ||
    me?.stage === "ACTION_REQUIRED"
  );
}

/** Server says this step is done (unknown / absent counts as done). */
function serverStepDone(me: DealerMe, step: StepKey) {
  if (!isRecord(me.steps)) return true;
  const steps = me.steps as Record<string, unknown>;
  return SERVER_STEPS[step].every((key) => steps[key] !== false);
}

function missingItems(me: DealerMe): DealerMissing[] {
  return Array.isArray(me.missing)
    ? (me.missing as unknown[]).flatMap((item) =>
        isRecord(item)
          ? [item as DealerMissing]
          : typeof item === "string"
            ? [{ label: item }]
            : [],
      )
    : [];
}

// ---------------------------------------------------------------------------
// The resolver
// ---------------------------------------------------------------------------

const ALL_COMPLETE: Record<StepKey, StepState> = {
  basic: "COMPLETE",
  verification: "COMPLETE",
  contact: "COMPLETE",
};

function resolveGate(
  me: DealerMe | null | undefined,
  fixedSteps: StepKey[] = [],
): BaseGate {
  const dealer: DealerMe = me ?? {};
  const status = normalizeStatus(dealer.profile?.verificationStatus);

  // 1. APPROVED: the only state that unlocks the dealer app.
  if (status === "APPROVED") {
    return {
      phase: "APPROVED",
      route: HOME_ROUTE,
      allowedPaths: [],
      steps: ALL_COMPLETE,
      currentStep: null,
      todoSteps: [],
      readyToSubmit: false,
      needsResubmit: false,
      manualFix: false,
    };
  }

  const rejectedState = isRejectedState(dealer);
  const fixed = new Set(fixedSteps);
  const rejected = new Set<StepKey>();
  let manualFix = false;

  // 2. What did the reviewer reject?
  for (const doc of dealer.documents ?? []) {
    if (doc.status === "REJECTED") rejected.add("verification");
  }

  if (rejectedState) {
    const issues = dealer.issues ?? [];
    for (const issue of issues) {
      const step = classifyIssue(issue);
      if (step) rejected.add(step);
      else manualFix = true;
    }
    if (rejected.size === 0 && issues.length === 0) manualFix = true;
  }

  // 3. Per-step state. The server's own `steps` flags decide "incomplete"
  //    (this applies to rejected dealers too: canSubmit stays false until
  //    every step is done). A rejected step counts until the dealer corrects it.
  const steps = {} as Record<StepKey, StepState>;
  for (const step of STEP_ORDER) {
    steps[step] =
      rejected.has(step) && !fixed.has(step)
        ? "REJECTED"
        : !serverStepDone(dealer, step)
          ? "INCOMPLETE"
          : "COMPLETE";
  }

  // 4. Everything that still needs work. Completed steps are never repeated.
  const todoSteps = STEP_ORDER.filter((step) => steps[step] !== "COMPLETE");
  const currentStep = todoSteps[0] ?? null;

  // 5. REJECTED: the status page is the hub. It shows the reasons and sends the
  //    dealer only to the step(s) that still need work, never to completed ones.
  //    When nothing is left to correct it offers an explicit "Resubmit".
  if (rejectedState) {
    const reachable = manualFix ? STEP_ORDER : todoSteps;

    return {
      phase: "REJECTED",
      route: PENDING_ROUTE,
      allowedPaths: [PENDING_ROUTE, ...reachable.map((step) => STEP_ROUTES[step])],
      steps,
      currentStep,
      todoSteps,
      readyToSubmit: false,
      needsResubmit: todoSteps.length === 0 && !manualFix,
      manualFix,
    };
  }

  // 6. First-time onboarding: forced sequence, resume the exact unfinished step.
  if (currentStep) {
    return {
      phase: "ONBOARDING",
      route: STEP_ROUTES[currentStep],
      allowedPaths: [STEP_ROUTES[currentStep]],
      steps,
      currentStep,
      todoSteps,
      readyToSubmit: false,
      needsResubmit: false,
      manualFix: false,
    };
  }

  // 7. First time: every step is done but the dealer never pressed Submit.
  //    The last step's "Submit for Verification" button is that explicit action.
  const submitted = Boolean(dealer.journey?.submittedAt);

  if (dealer.canSubmit === true && !submitted) {
    return {
      phase: "ONBOARDING",
      route: STEP_ROUTES.contact,
      allowedPaths: [STEP_ROUTES.contact],
      steps,
      currentStep: "contact",
      todoSteps,
      readyToSubmit: true,
      needsResubmit: false,
      manualFix: false,
    };
  }

  // 8. Submitted, waiting for review.
  return {
    phase: "PENDING",
    route: PENDING_ROUTE,
    allowedPaths: [PENDING_ROUTE],
    steps,
    currentStep: null,
    todoSteps,
    readyToSubmit: false,
    needsResubmit: false,
    manualFix: false,
  };
}

/**
 * Where should this dealer be, and what may they do?
 *
 *   APPROVED  -> the dealer app, everything including bidding
 *   PENDING   -> the dealer app too (a submitted dealer can add products, manage
 *                inventory and logistics); only bidding waits for approval
 *   REJECTED / still onboarding -> the screen that fixes it, nothing else
 */
export function getDealerGate(
  me: DealerMe | null | undefined,
  fixedSteps: StepKey[] = [],
): DealerGate {
  const base = resolveGate(me, fixedSteps);

  return {
    ...base,
    route: base.phase === "PENDING" ? HOME_ROUTE : base.route,
    canUseApp: base.phase === "APPROVED" || base.phase === "PENDING",
    canBid: base.phase === "APPROVED",
  };
}

// ---------------------------------------------------------------------------
// Path guard
// ---------------------------------------------------------------------------

function normalizePath(pathname: string) {
  const path = pathname.split("?")[0].replace(/\/index$/, "").replace(/\/+$/, "");
  return path || "/";
}

/** Is the dealer allowed to be on `pathname` (a /dealer/... path) right now? */
export function isPathAllowed(gate: DealerGate, pathname: string) {
  const path = normalizePath(pathname);

  // The dealer app (dashboard, inventory, orders, logistics...) is open to anyone
  // who canUseApp. Onboarding step screens never are; the status page only while
  // it is listed in allowedPaths (PENDING / REJECTED).
  const inApp = path.startsWith("/dealer/") && !path.startsWith("/dealer/onboarding");
  if (gate.canUseApp && inApp) return true;

  return gate.allowedPaths.includes(path);
}

// ---------------------------------------------------------------------------
// Rejection text shown on the step that must be corrected
// ---------------------------------------------------------------------------

export function getStepNotices(me: DealerMe, step: StepKey): string[] {
  const notices: string[] = [];

  if (isRejectedState(me)) {
    for (const issue of me.issues ?? []) {
      if (issue.reason && classifyIssue(issue) === step) notices.push(issue.reason);
    }

    if (step === "verification") {
      for (const doc of me.documents ?? []) {
        if (doc.status === "REJECTED" && doc.rejectionReason) {
          notices.push(`${DOCUMENT_LABELS[doc.type] ?? doc.type}: ${doc.rejectionReason}`);
        }
      }
    }
  }

  // Things the server says are still required for this step (any status).
  for (const item of missingItems(me)) {
    const target = item.step ? SERVER_TO_STEP[item.step] : classifyText(item.label ?? "");
    if (target === step && item.label) notices.push(`Required: ${item.label}`);
  }

  return Array.from(new Set(notices));
}
