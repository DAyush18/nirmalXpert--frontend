import type { UpsertInventoryPayload } from "@/types/inventory";
import type { DeliveryStatus, OrderStatus } from "@/types/orders";
import { api } from "./client";

export type BasicInfoPayload = {
  legalName: string;
  businessName: string;
  yearsInBusiness: number;
  employeeRange: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  gstRegistered: boolean;
};

export type UpdateLocationPayload = {
  contactPersonName?: string;
  businessEmail?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  deliveryRadiusKm?: number;
  hasWarehouse?: boolean;
};

export type ImageFile = {
  uri: string;
  name: string;
  type: string;
};

// Backend: router.post('/profile/photo', uploadProfilePhoto.single('photo'))
const PROFILE_PHOTO_ENDPOINT = "/dealer/profile/photo";
const PROFILE_PHOTO_FIELD = "photo";

export const dealerApi = {
  // -------------------------
  // Dealer profile
  // -------------------------

  getMe: async () => {
    const response = await api.get("/dealer/me");
    return response.data;
  },

  updateBasic: async (data: BasicInfoPayload) => {
    const response = await api.patch("/dealer/profile/basic", data);
    return response.data;
  },

  submit: async () => {
    const response = await api.post("/dealer/submit");

    return response.data;
  },

  // -------------------------
  // Categories
  // -------------------------

  getCategories: async () => {
    const response = await api.get("/dealer/categories");
    return response.data;
  },

  updateLocation: async (payload: UpdateLocationPayload) => {
    const response = await api.patch("/dealer/profile/location", payload);

    return response.data;
  },

  updateCategories: async (categoryIds: string[]) => {
    const response = await api.put("/dealer/categories", {
      categoryIds,
    });

    return response.data;
  },

  // -------------------------
  // Business images
  // -------------------------

  uploadImages: async (logo?: ImageFile, cover?: ImageFile) => {
    const formData = new FormData();

    if (cover) {
      formData.append("cover", {
        uri: cover.uri,
        name: cover.name,
        type: cover.type,
      } as any);
    }

    if (logo) {
      formData.append("logo", {
        uri: logo.uri,
        name: logo.name,
        type: logo.type,
      } as any);
    }

    const response = await api.post("/dealer/profile/images", formData, {
      // IMPORTANT:
      // Don't manually set multipart Content-Type in React Native.
      // Axios/fetch needs to generate the boundary.
    });

    return response.data;
  },

  uploadProfilePhoto: async (photo: ImageFile) => {
    const formData = new FormData();

    formData.append(PROFILE_PHOTO_FIELD, {
      uri: photo.uri,
      name: photo.name,
      type: photo.type,
    } as any);

    // Don't set a multipart Content-Type manually in React Native.
    const response = await api.post(PROFILE_PHOTO_ENDPOINT, formData);

    return response.data;
  },

  // -------------------------
  // Dashboard
  // -------------------------

  getDashboard: async () => {
    const response = await api.get("/dealer/dashboard");
    return response.data;
  },

  // -------------------------
  // Inventory
  // -------------------------

  // GET /dealer/inventory: the dealer's own products (price, stock, clearance...)
  getInventory: async () => {
    const response = await api.get("/dealer/inventory");
    return response.data;
  },

  // GET /dealer/inventory/catalog?search=...: every product the dealer can stock
  getInventoryCatalog: async (search?: string) => {
    const response = await api.get("/dealer/inventory/catalog", {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  // PUT /dealer/inventory/:productId: adds the product to inventory, or updates it
  upsertInventory: async (productId: string, data: UpsertInventoryPayload) => {
    const response = await api.put(`/dealer/inventory/${productId}`, data);
    return response.data;
  },

  // -------------------------
  // Orders
  // -------------------------

  // GET /dealer/orders?status=&page=&limit=
  getOrders: async (params: { status?: OrderStatus; page?: number; limit?: number }) => {
    const response = await api.get("/dealer/orders", { params });
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await api.get(`/dealer/orders/${id}`);
    return response.data;
  },

  acceptOrder: async (id: string) => {
    const response = await api.patch(`/dealer/orders/${id}/accept`);
    return response.data;
  },

  rejectOrder: async (id: string, reason: string) => {
    const response = await api.patch(`/dealer/orders/${id}/reject`, { reason });
    return response.data;
  },

  // ACCEPTED -> PREPARING (shown as "Processing")
  markOrderPreparing: async (id: string) => {
    const response = await api.patch(`/dealer/orders/${id}/preparing`);
    return response.data;
  },

  // -------------------------
  // Logistics partners (riders) and deliveries
  // -------------------------

  getRiders: async () => {
    const response = await api.get("/dealer/riders");
    return response.data;
  },

  createRider: async (data: { name: string; phone: string }) => {
    const response = await api.post("/dealer/riders", data);
    return response.data;
  },

  updateRider: async (id: string, data: { name?: string; phone?: string }) => {
    const response = await api.patch(`/dealer/riders/${id}`, data);
    return response.data;
  },

  // DELETE switches the rider off (riders are never really deleted)
  removeRider: async (id: string) => {
    const response = await api.delete(`/dealer/riders/${id}`);
    return response.data;
  },

  assignRider: async (orderId: string, riderId: string) => {
    const response = await api.post("/dealer/riders/assign", { orderId, riderId });
    return response.data;
  },

  // ASSIGNED -> PICKED_UP -> (OUT_FOR_DELIVERY) -> DELIVERED
  updateDeliveryStatus: async (
    orderId: string,
    status: Exclude<DeliveryStatus, "ASSIGNED">,
  ) => {
    const response = await api.patch(`/dealer/riders/deliveries/${orderId}`, { status });
    return response.data;
  },
};
