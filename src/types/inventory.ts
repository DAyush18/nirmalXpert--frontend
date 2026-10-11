// Types for /dealer/inventory. The backend returns Prisma rows, so Decimal columns
// (price, clearancePrice) arrive as strings; lib/inventory.ts converts them.

export type InventoryStatus = "ACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CLEARANCE";

/** What identifies a product on every inventory screen. */
export type ProductInfo = {
  productId: string;
  name: string;
  sku: string | null;
  brand: string | null;
  unit: string | null;
  categoryId: string | null;
  categoryName: string;
};

/** One row of GET /dealer/inventory, normalized. */
export type InventoryItem = ProductInfo & {
  id: string;
  price: number;
  stock: number;
  availableForBidding: boolean;
  isClearance: boolean;
  clearancePrice: number | null;
  status: InventoryStatus;
};

/** One product of GET /dealer/inventory/catalog, normalized. */
export type CatalogProduct = ProductInfo & {
  /** The dealer already stocks it (the catalog returns their dealerProducts row). */
  inInventory: boolean;
};

export type InventoryCounts = {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
  clearance: number;
};

export type InventoryFilters = {
  query: string;
  categoryId: string | null;
  status: InventoryStatus | "ALL";
};

export type InventoryCategory = { id: string; name: string };

/** Body of PUT /dealer/inventory/:productId */
export type UpsertInventoryPayload = {
  price: number;
  stock: number;
  availableForBidding: boolean;
  isClearance: boolean;
  clearancePrice: number | null;
};
