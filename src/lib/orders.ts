/**
 * Pure order + rider logic (no React): response normalizing, which actions an
 * order offers, search, counts, and validation. If a backend response differs
 * from what the backend code shows, this is the file to adjust.
 */
import type {
  DeliveryInfo,
  DeliveryStatus,
  OrderAction,
  OrderFilter,
  OrderLine,
  OrderPayment,
  OrderRow,
  OrderStatus,
  OrdersPage,
  Rider,
  RiderStatus,
} from "@/types/orders";

// ---------------------------------------------------------------------------
// Labels and colours
// ---------------------------------------------------------------------------

// Full class names (not built dynamically) so NativeWind can see them.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; pill: string; text: string }> = {
  PENDING: { label: "Pending", pill: "bg-orange-100", text: "text-orange-600" },
  ACCEPTED: { label: "Accepted", pill: "bg-blue-100", text: "text-blue-600" },
  PREPARING: { label: "Processing", pill: "bg-purple-100", text: "text-purple-600" },
  OUT_FOR_DELIVERY: { label: "Out for delivery", pill: "bg-indigo-100", text: "text-indigo-600" },
  DELIVERED: { label: "Delivered", pill: "bg-green-100", text: "text-green-600" },
  REJECTED: { label: "Rejected", pill: "bg-red-100", text: "text-red-600" },
  EXPIRED: { label: "Expired", pill: "bg-gray-100", text: "text-gray-600" },
  CANCELLED: { label: "Cancelled", pill: "bg-gray-100", text: "text-gray-600" },
};

export const ORDER_FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "PREPARING", label: "Processing" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "EXPIRED", label: "Expired" },
];

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  ASSIGNED: "Rider assigned",
  PICKED_UP: "Picked up",
  OUT_FOR_DELIVERY: "On the way",
  DELIVERED: "Delivered",
};

// ---------------------------------------------------------------------------
// Normalizing the backend responses
// ---------------------------------------------------------------------------

type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : {};

const str = (...values: unknown[]): string | null => {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

/** Accepts numbers and Prisma Decimal strings ("51750.00"). */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const ORDER_STATUSES = Object.keys(ORDER_STATUS_META) as OrderStatus[];
const DELIVERY_STATUSES = Object.keys(DELIVERY_LABEL) as DeliveryStatus[];

function normalizeDelivery(raw: unknown): DeliveryInfo | null {
  const d = rec(raw);
  const status = String(d.status ?? "").toUpperCase() as DeliveryStatus;
  if (!DELIVERY_STATUSES.includes(status)) return null;

  const rider = rec(d.rider);

  return {
    status,
    riderId: str(rider.id, d.riderId),
    riderName: str(rider.name),
    riderPhone: str(rider.phone),
    assignedAt: str(d.assignedAt),
    deliveredAt: str(d.deliveredAt),
  };
}

export function normalizeOrder(raw: unknown): OrderRow | null {
  const o = rec(raw);
  const id = str(o.id);
  const status = String(o.status ?? "").toUpperCase() as OrderStatus;
  if (!id || !ORDER_STATUSES.includes(status)) return null;

  const items: OrderLine[] = (Array.isArray(o.items) ? o.items : []).map((entry, index) => {
    const item = rec(entry);
    return {
      id: str(item.id) ?? `${id}-item-${index}`,
      name: str(item.productName) ?? "Product",
      quantity: toNumber(item.quantity) ?? 0,
      // not in the orders include today; shown automatically once the backend adds it
      unit: str(item.unit, rec(rec(item.dealerProduct).product).unit),
      price: toNumber(item.price) ?? 0,
    };
  });

  const payments: OrderPayment[] = (Array.isArray(o.payments) ? o.payments : []).map((entry, index) => {
    const payment = rec(entry);
    return {
      id: str(payment.id) ?? `${id}-payment-${index}`,
      method: str(payment.method) ?? "",
      status: str(payment.status) ?? "",
      amount: toNumber(payment.amount) ?? 0,
    };
  });

  const street = str(o.shipAddress);
  const city = str(o.shipCity);
  const state = str(o.shipState);
  const pincode = str(o.shipPincode);

  return {
    id,
    orderNumber: str(o.orderNumber) ?? id.slice(0, 8).toUpperCase(),
    status,
    createdAt: str(o.createdAt) ?? "",
    respondBy: str(o.respondBy),
    customerName: str(o.shipFullName) ?? "Customer",
    customerPhone: str(o.shipPhone),
    address: [street, city, [state, pincode].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    shortAddress: [street, city].filter(Boolean).join(", "),
    total: toNumber(o.totalAmount) ?? 0,
    rejectionReason: str(o.rejectionReason),
    items,
    payments,
    delivery: normalizeDelivery(o.delivery),
  };
}

/** GET /dealer/orders -> { data, page, limit, total, totalPages } */
export function normalizeOrdersResponse(raw: unknown): OrdersPage {
  const body = rec(raw);
  const list = Array.isArray(body.data) ? body.data : Array.isArray(raw) ? raw : [];

  const items = list.map(normalizeOrder).filter((order): order is OrderRow => order !== null);
  const page = toNumber(body.page) ?? 1;

  return {
    items,
    page,
    totalPages: Math.max(toNumber(body.totalPages) ?? 1, 1),
    total: toNumber(body.total) ?? items.length,
  };
}

/** Add a later page without duplicating orders that moved between pages. */
export function mergeById(existing: OrderRow[], incoming: OrderRow[]): OrderRow[] {
  const seen = new Set(existing.map((order) => order.id));
  return [...existing, ...incoming.filter((order) => !seen.has(order.id))];
}

/** First product, plus "+N more". */
export function orderTitle(order: OrderRow) {
  if (order.items.length === 0) return "Order";
  const first = order.items[0].name;
  return order.items.length > 1 ? `${first} +${order.items.length - 1} more` : first;
}

/** "Qty: 200", or "3 items" when there is more than one product. */
export function orderQuantityText(order: OrderRow) {
  if (order.items.length === 0) return "";
  if (order.items.length > 1) return `${order.items.length} items`;
  const { quantity, unit } = order.items[0];
  return `Qty: ${quantity}${unit ? ` ${unit}` : ""}`;
}

// ---------------------------------------------------------------------------
// What can the dealer do with this order?
// ---------------------------------------------------------------------------

/**
 * Mirrors the backend rules (orders.service.ts / riders.service.ts):
 *  - accept: PENDING and before respondBy; reject: PENDING
 *  - preparing: ACCEPTED
 *  - assign / re-assign a rider: ACCEPTED or PREPARING (re-assign only while ASSIGNED)
 *  - delivery moves ASSIGNED -> PICKED_UP -> (OUT_FOR_DELIVERY) -> DELIVERED, and
 *    PICKED_UP already sets the ORDER to OUT_FOR_DELIVERY, so "Mark out for
 *    delivery" sends PICKED_UP.
 */
export function getOrderActions(order: OrderRow, now: number = Date.now()): OrderAction[] {
  switch (order.status) {
    case "PENDING": {
      const deadline = order.respondBy ? new Date(order.respondBy).getTime() : null;
      const open = deadline == null || Number.isNaN(deadline) || deadline > now;
      return open ? ["ACCEPT", "REJECT"] : ["REJECT"]; // accepting after the deadline is refused
    }

    case "ACCEPTED":
      return ["PREPARING", "ASSIGN"];

    case "PREPARING":
      if (!order.delivery) return ["ASSIGN"];
      return order.delivery.status === "ASSIGNED" ? ["MARK_OUT", "ASSIGN"] : ["MARK_DELIVERED"];

    case "OUT_FOR_DELIVERY":
      return order.delivery ? ["MARK_DELIVERED"] : [];

    default:
      return [];
  }
}

export function actionLabel(action: OrderAction, order: OrderRow) {
  switch (action) {
    case "ACCEPT":
      return "Accept";
    case "REJECT":
      return "Reject";
    case "PREPARING":
      return "Processing";
    case "ASSIGN":
      return order.delivery ? "Change Logistics" : "Assign Logistics";
    case "MARK_OUT":
      return "Mark out for delivery";
    case "MARK_DELIVERED":
      return "Mark delivered";
  }
}

// ---------------------------------------------------------------------------
// Search and counts
// ---------------------------------------------------------------------------

/** The orders endpoint has no search, so this filters what is already loaded. */
export function searchOrders(items: OrderRow[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  return items.filter((order) =>
    [
      order.orderNumber,
      order.customerName,
      order.shortAddress,
      ...order.items.map((item) => item.name),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

/** dashboard.orders.byStatus -> counts per filter, with "All" as the sum. */
export function countsFromByStatus(raw: unknown): Record<OrderFilter, number> | null {
  const byStatus = rec(raw);
  if (Object.keys(byStatus).length === 0) return null;

  const counts = { ALL: 0 } as Record<OrderFilter, number>;

  for (const status of ORDER_STATUSES) {
    const n = toNumber(byStatus[status]) ?? 0;
    counts[status] = n;
    counts.ALL += n;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Reject reason + riders
// ---------------------------------------------------------------------------

export const REJECT_REASONS = [
  "Out of stock",
  "Cannot deliver to this location",
  "Price has changed",
];

export function validateRejectReason(text: string): { ok: true; reason: string } | { ok: false; message: string } {
  const reason = text.trim();
  if (reason.length < 3) return { ok: false, message: "Please give a reason (at least 3 characters)." };
  if (reason.length > 200) return { ok: false, message: "The reason can be at most 200 characters." };
  return { ok: true, reason };
}

export function normalizeRider(raw: unknown): Rider | null {
  const r = rec(raw);
  const id = str(r.id);
  if (!id) return null;

  const open = Array.isArray(r.deliveries) ? r.deliveries.length : 0;

  return {
    id,
    name: str(r.name) ?? "Driver",
    phone: str(r.phone) ?? "",
    isActive: r.isActive !== false,
    openDeliveries: open,
  };
}

export function normalizeRiders(raw: unknown): Rider[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map(normalizeRider).filter((rider): rider is Rider => rider !== null);
}

export function riderStatus(rider: Rider): RiderStatus {
  if (!rider.isActive) return "INACTIVE";
  return rider.openDeliveries > 0 ? "ON_DUTY" : "AVAILABLE";
}

export function riderStats(riders: Rider[]) {
  const onDuty = riders.filter((rider) => riderStatus(rider) === "ON_DUTY").length;

  return {
    total: riders.length,
    onDuty,
    available: riders.filter((rider) => riderStatus(rider) === "AVAILABLE").length,
  };
}

/** "+91 98765 43210" / "098765 43210" / "9876543210" -> "9876543210" (or null). */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null; // same rule as the backend
}

export function formatPhone(phone: string) {
  return /^\d{10}$/.test(phone) ? `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

export function validateRiderForm(input: { name: string; phone: string }):
  | { ok: true; value: { name: string; phone: string } }
  | { ok: false; message: string } {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, message: "Please enter the driver's name." };

  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, message: "Enter a valid 10-digit Indian mobile number." };

  return { ok: true, value: { name, phone } };
}
