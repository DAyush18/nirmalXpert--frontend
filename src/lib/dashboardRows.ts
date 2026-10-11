/**
 * recentOrders[] and activeBids[] were empty in the sample response, so the item
 * shape is not confirmed. These normalizers accept the likely field names (taken
 * from your Prisma schema) and fall back safely. If your real items differ, this
 * is the only file to adjust.
 */

export type OrderRow = {
  id: string;
  number: string;
  status: string;
  title: string;
  detail: string;
  amount: number;
  createdAt: string;
};

export type BidState = "ACTIVE" | "WINNING" | "OUTBID";

export type BidRow = {
  id: string;
  title: string;
  detail: string;
  myBid: number | null;
  lowest: number | null;
  endsAt: string | null;
  state: BidState;
};

type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : {};

const str = (...values: unknown[]) => {
  for (const v of values) if (typeof v === "string" && v.trim()) return v;
  return null;
};

const num = (...values: unknown[]) => {
  for (const v of values) {
    const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return null;
};

export function normalizeOrder(raw: unknown, index = 0): OrderRow {
  const o = rec(raw);
  const items = Array.isArray(o.items) ? o.items.map(rec) : [];
  // the dashboard sends { firstItem: { productName, quantity, unit }, itemCount }
  const first = items[0] ?? rec(o.firstItem);
  const count = num(o.itemCount) ?? items.length;
  const product = rec(first.product);
  const customer = rec(o.customer);
  const user = rec(customer.user);

  const name = str(o.productName, first.productName, product.name) ?? "Order";
  const qty = num(o.quantity, o.totalQuantity, first.quantity);
  const unit = str(o.unit, first.unit, product.unit);
  const who = str(o.customerName, customer.name, user.name, o.shipFullName);

  return {
    id: str(o.id) ?? `order-${index}`,
    number: str(o.orderNumber, o.number) ?? "",
    status: String(o.status ?? "").toUpperCase(),
    title: count > 1 ? `${name} +${count - 1} more` : name,
    detail: [qty != null ? `${qty}${unit ? ` ${unit}` : ""}` : null, who]
      .filter(Boolean)
      .join(" · "),
    amount: num(o.totalAmount, o.amount, o.total) ?? 0,
    createdAt: str(o.createdAt, o.placedAt) ?? "",
  };
}

export function normalizeBid(raw: unknown, index = 0): BidRow {
  const b = rec(raw);
  const event = rec(b.biddingEvent);
  const dealerProduct = rec(b.dealerProduct);
  const product = rec(b.product ?? dealerProduct.product ?? event.product);

  const myBid = num(b.myBid, b.myPrice, b.price);
  const lowest = num(b.lowestPrice, b.lowestBid, b.lowest);
  const suppliers = num(b.suppliers, b.suppliersBidding, b.biddersCount, b.bidderCount, b.totalBids);
  const qty = num(b.quantityLimit, b.quantity);
  const unit = str(b.unit, product.unit);

  const explicit = String(b.status ?? b.state ?? "").toUpperCase();
  let state: BidState = "ACTIVE";

  if (explicit.includes("WIN")) state = "WINNING";
  else if (explicit.includes("OUTBID")) state = "OUTBID";
  else if (b.isWinning === true) state = "WINNING";
  else if (myBid != null && lowest != null) state = lowest < myBid ? "OUTBID" : "WINNING";

  return {
    id: str(b.id, b.bidId) ?? `bid-${index}`,
    title: str(b.productName, product.name) ?? "Bid",
    detail: [
      qty != null ? `${qty}${unit ? ` ${unit}` : ""}` : null,
      suppliers != null ? `${suppliers} suppliers bidding` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    myBid,
    lowest,
    endsAt: str(b.endsAt, event.endsAt),
    state,
  };
}
