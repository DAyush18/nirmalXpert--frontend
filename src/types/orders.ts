// Types for /dealer/orders and /dealer/riders (from the backend code).
// Prisma Decimal columns (totalAmount, price, amount) arrive as strings.

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type DeliveryStatus = "ASSIGNED" | "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED";

export type OrderFilter = "ALL" | OrderStatus;

export type OrderLine = {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  price: number;
};

export type OrderPayment = {
  id: string;
  method: string;
  status: string;
  amount: number;
};

export type DeliveryInfo = {
  status: DeliveryStatus;
  riderId: string | null;
  riderName: string | null;
  riderPhone: string | null;
  assignedAt: string | null;
  deliveredAt: string | null;
};

export type OrderRow = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  /** The dealer must accept / reject before this (PENDING orders). */
  respondBy: string | null;
  customerName: string;
  customerPhone: string | null;
  /** Full address, for the detail screen. */
  address: string;
  /** "Sector 18, Noida", for the card. */
  shortAddress: string;
  total: number;
  rejectionReason: string | null;
  items: OrderLine[];
  payments: OrderPayment[];
  delivery: DeliveryInfo | null;
};

export type OrdersPage = {
  items: OrderRow[];
  page: number;
  totalPages: number;
  total: number;
};

export type OrderAction =
  | "ACCEPT"
  | "REJECT"
  | "PREPARING"
  | "ASSIGN"
  | "MARK_OUT"
  | "MARK_DELIVERED";

export type Rider = {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  /** Deliveries still in progress (ASSIGNED / PICKED_UP / OUT_FOR_DELIVERY). */
  openDeliveries: number;
};

export type RiderStatus = "ON_DUTY" | "AVAILABLE" | "INACTIVE";
