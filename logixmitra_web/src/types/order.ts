// export type OrderStatus = "Pending" | "Shipped" | "Delivered" | "RTO" | "Cancelled";
// export type Platform = "Manual" | "Amazon" | "Shopify" | "WooCommerce" | "Custom";

// export interface Order {
//   id: string;
//   customer: string;
//   seller: string;
//   courier: string;
//   status: OrderStatus;
//   amount: string;
//   date: string;
//   awb: string;
//   destination: string;
//   phone: string;
//   address: string;
//   platform?: Platform;
//   platformOrderId?: string;
// }

// export interface IntegrationConfig {
//   id: string;
//   type: Platform;
//   name: string;
//   isActive: boolean;
//   lastSync?: string;
//   credentials: {
//     apiKey?: string;
//     apiSecret?: string;
//     storeUrl?: string;
//     accessToken?: string;
//     sellerId?: string;
//     marketplaceId?: string;
//     username?: string;
//     password?: string;
//     webhookUrl?: string;
//   };
// }

// export interface SyncResult {
//   success: boolean;
//   ordersSynced: number;
//   errors?: string[];
//   syncId: string;
//   platform: Platform;
// }


// types/order.ts
export type OrderStatus = 'Pending' | 'Shipped' | 'Delivered' | 'RTO' | 'Cancelled';
export type Platform = 'Manual' | 'Amazon' | 'Shopify' | 'WooCommerce' | 'Custom' | 'Merged';

export interface OrderItem {
  id?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  gstRate: number; // in percentage
  totalPrice: number;
  height?: number; // in cm
  width?: number; // in cm
  length?: number; // in cm
  deadWeight?: number; // in kg
  volumetricWeight?: number; // calculated automatically
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  seller: string;
  courier: string;
  status: OrderStatus;
  amount: string;
  orderDate: string;
  awb: string;
  platform: Platform;
  
  // Address fields - separated
  pincode: string;
  city: string;
  state: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  
  // Items
  items: OrderItem[];
  
  // Calculated fields
  totalItems: number;
  totalWeight?: number;
  totalVolumetricWeight?: number;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationConfig {
  id: string;
  type: Platform;
  name: string;
  isActive: boolean;
  lastSync?: string;
  credentials: Record<string, any>;
}

export interface SyncResult {
  platform: Platform;
  success: boolean;
  ordersSynced: number;
  errors?: string[];
}

export interface CreateOrderDTO {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  seller: string;
  courier: string;
  status: OrderStatus;
  amount: string;
  orderDate: string;
  awb?: string;
  platform: Platform;
  pincode: string;
  city: string;
  state: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  items: Omit<OrderItem, 'id' | 'volumetricWeight' | 'totalPrice'>[];
}

export interface UpdateOrderDTO extends Partial<CreateOrderDTO> {}