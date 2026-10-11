/**
 * Pure inventory logic (no React): response normalizing, status, counts, filters,
 * and form validation. If your response differs from what the backend code shows,
 * this is the file to adjust.
 */
import type {
  CatalogProduct,
  InventoryCategory,
  InventoryCounts,
  InventoryFilters,
  InventoryItem,
  InventoryStatus,
  ProductInfo,
  UpsertInventoryPayload,
} from "@/types/inventory";

// Same rule as the dashboard (`lowStockThreshold: 5`): stock above 0 and up to this.
export const LOW_STOCK_THRESHOLD = 5;

export const STATUS_LABEL: Record<InventoryStatus, string> = {
  ACTIVE: "Active",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
  CLEARANCE: "Clearance",
};

export const STATUS_FILTERS: { value: InventoryStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "LOW_STOCK", label: "Low Stock" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "CLEARANCE", label: "Clearance" },
];

export const NO_FILTERS: InventoryFilters = { query: "", categoryId: null, status: "ALL" };

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/**
 * One status per product (the summary counts add up to the total).
 * Precedence: out of stock > clearance > low stock > active.
 */
export function computeStatus(stock: number, isClearance: boolean): InventoryStatus {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (isClearance) return "CLEARANCE";
  if (stock <= LOW_STOCK_THRESHOLD) return "LOW_STOCK";
  return "ACTIVE";
}

function normalizeStatus(value: unknown): InventoryStatus | null {
  const key = String(value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return key in STATUS_LABEL ? (key as InventoryStatus) : null;
}

// ---------------------------------------------------------------------------
// Normalizing the backend response
// ---------------------------------------------------------------------------

type Rec = Record<string, unknown>;

const rec = (v: unknown): Rec =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Rec) : {};

const str = (...values: unknown[]): string | null => {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return null;
};

/** Accepts numbers and Prisma Decimal strings ("380", "62,400.50"). */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function productInfo(raw: unknown, fallbackId: string | null): ProductInfo | null {
  const p = rec(raw);
  const category = rec(p.category);
  const productId = str(p.id, fallbackId);
  if (!productId) return null;

  return {
    productId,
    name: str(p.name) ?? "Unnamed product",
    sku: str(p.sku),
    // `brand` is a { id, name } relation now (it used to be a plain string column)
    brand: str(p.brand, rec(p.brand).name),
    unit: str(p.unit),
    categoryId: str(category.id, p.categoryId),
    categoryName: str(category.name, typeof p.category === "string" ? p.category : null) ?? "Uncategorized",
  };
}

export function normalizeInventoryItem(raw: unknown): InventoryItem | null {
  const r = rec(raw);
  const info = productInfo(r.product, str(r.productId));
  if (!info) return null;

  const stock = toNumber(r.stock) ?? 0;
  const isClearance = r.isClearance === true;

  return {
    ...info,
    id: str(r.id) ?? info.productId,
    price: toNumber(r.price) ?? 0,
    stock,
    availableForBidding: r.availableForBidding === true,
    isClearance,
    clearancePrice: toNumber(r.clearancePrice),
    // use a status from the backend if it ever sends one, otherwise compute it
    status: normalizeStatus(r.status) ?? computeStatus(stock, isClearance),
  };
}

function normalizeCounts(raw: unknown): InventoryCounts | null {
  const c = rec(raw);
  const total = toNumber(c.total);
  if (total == null) return null;

  return {
    total,
    active: toNumber(c.active) ?? 0,
    lowStock: toNumber(c.lowStock ?? c.low_stock) ?? 0,
    outOfStock: toNumber(c.outOfStock ?? c.out_of_stock) ?? 0,
    clearance: toNumber(c.clearance) ?? 0,
  };
}

export const sortItems = (items: InventoryItem[]) =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Today the endpoint returns a plain array. If it later returns
 * { items, counts }, the backend counts are used instead of computing them.
 */
export function normalizeInventoryResponse(raw: unknown): {
  items: InventoryItem[];
  counts: InventoryCounts | null;
} {
  const body = rec(raw);
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(body.items)
      ? body.items
      : Array.isArray(body.data)
        ? body.data
        : [];

  const items = list
    .map(normalizeInventoryItem)
    .filter((item): item is InventoryItem => item !== null);

  return {
    items: sortItems(items),
    counts: Array.isArray(raw) ? null : normalizeCounts(body.counts),
  };
}

export function normalizeCatalog(raw: unknown): CatalogProduct[] {
  const list = Array.isArray(raw) ? raw : [];

  return list.flatMap((entry): CatalogProduct[] => {
    const info = productInfo(entry, null);
    if (!info) return [];

    const mine = rec(entry).dealerProducts;
    return [{ ...info, inInventory: Array.isArray(mine) && mine.length > 0 }];
  });
}

/** The item as it will look after a successful save (the list refetches anyway). */
export function itemFromSave(
  info: ProductInfo,
  payload: UpsertInventoryPayload,
  existingId?: string,
): InventoryItem {
  return {
    ...info,
    id: existingId ?? info.productId,
    ...payload,
    status: computeStatus(payload.stock, payload.isClearance),
  };
}

// ---------------------------------------------------------------------------
// Filters and counts
// ---------------------------------------------------------------------------

export function filterInventory(items: InventoryItem[], filters: InventoryFilters) {
  const query = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.status !== "ALL" && item.status !== filters.status) return false;
    if (filters.categoryId && item.categoryId !== filters.categoryId) return false;

    if (query) {
      const haystack = [item.name, item.sku, item.brand, item.categoryName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

export const hasActiveFilters = (f: InventoryFilters) =>
  f.query.trim() !== "" || f.categoryId !== null || f.status !== "ALL";

/** Categories the dealer's inventory actually contains. */
export function deriveCategories(items: InventoryItem[]): InventoryCategory[] {
  const byId = new Map<string, InventoryCategory>();

  for (const item of items) {
    const id = item.categoryId ?? `name:${item.categoryName}`;
    if (!byId.has(id)) byId.set(id, { id, name: item.categoryName });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function computeCounts(items: InventoryItem[]): InventoryCounts {
  const counts: InventoryCounts = { total: items.length, active: 0, lowStock: 0, outOfStock: 0, clearance: 0 };

  for (const item of items) {
    if (item.status === "ACTIVE") counts.active += 1;
    else if (item.status === "LOW_STOCK") counts.lowStock += 1;
    else if (item.status === "OUT_OF_STOCK") counts.outOfStock += 1;
    else counts.clearance += 1;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Form validation -> PUT body (mirrors the backend zod schema)
// ---------------------------------------------------------------------------

export type InventoryFormInput = {
  price: string;
  stock: string;
  availableForBidding: boolean;
  isClearance: boolean;
  clearancePrice: string;
};

export type FormResult =
  | { ok: true; payload: UpsertInventoryPayload }
  | { ok: false; message: string };

const MAX_PRICE = 9_999_999_999; // Decimal(12, 2)
const MAX_STOCK = 2_147_483_647; // Int (32-bit)

function parseMoney(text: string): number | null {
  const n = toNumber(text);
  if (n == null || n <= 0 || n > MAX_PRICE) return null;
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6 ? n : null; // at most 2 decimals
}

export function buildUpsertPayload(input: InventoryFormInput): FormResult {
  const price = parseMoney(input.price);
  if (price == null) {
    return { ok: false, message: "Enter a valid price greater than 0 (up to 2 decimals)." };
  }

  const stockText = input.stock.trim().replace(/,/g, "");
  if (!/^\d+$/.test(stockText) || Number(stockText) > MAX_STOCK) {
    return { ok: false, message: "Enter the stock as a whole number (0 or more)." };
  }

  let clearancePrice: number | null = null;

  if (input.isClearance && input.clearancePrice.trim() !== "") {
    clearancePrice = parseMoney(input.clearancePrice);

    if (clearancePrice == null) {
      return { ok: false, message: "Enter a valid clearance price greater than 0." };
    }
    if (clearancePrice > price) {
      return { ok: false, message: "Clearance price cannot be higher than the regular price." };
    }
  }

  return {
    ok: true,
    payload: {
      price,
      stock: Number(stockText),
      availableForBidding: input.availableForBidding,
      isClearance: input.isClearance,
      clearancePrice: input.isClearance ? clearancePrice : null,
    },
  };
}
