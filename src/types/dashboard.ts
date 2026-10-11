// Shape of GET /dealer/dashboard (taken from a real response).
// recentOrders / activeBids / lowStockItems / pendingOrders.list were empty in the
// sample, so their items are `unknown` and normalized in lib/dashboardRows.ts.

export type MarketStatus = "OPEN" | "CLOSED" | string;

export type DashboardData = {
  header: {
    businessName: string;
    city: string | null;
    state: string | null;
    generatedAt: string;
    market: {
      status: MarketStatus;
      closesAt: string | null;
      nextOpensAt: string | null;
    };
  };
  stats: {
    totalProducts: { value: number; addedThisWeek: number };
    activeInventory: { units: number };
    ordersReceived: { total: number; today: number };
    ordersDelivered: { total: number; thisWeek: number };
    revenue: {
      month: number;
      lastMonthSamePeriod: number;
      changePercent: number | null;
      today: number;
    };
    activeBids: { count: number; winning: number };
    clearance: { products: number; value: number };
  };
  recentOrders: unknown[];
  activeBids: unknown[];
  inventoryAlerts: {
    outOfStock: number;
    lowStock: number;
    clearance: number;
    lowStockThreshold: number;
    lowStockItems: unknown[];
  };
  pendingOrders: { count: number; list: unknown[] };
  orders: {
    byStatus: Record<string, number>;
    last7Days: { date: string; sales: number; orders: number }[];
  };
  bidding: { openOpportunities: number };
  delivery: { activeRiders: number; inProgress: number };
};
