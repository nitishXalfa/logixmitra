import { IIntegrationService } from "./types";
import { Order, Platform } from "@/types/order";

export class ShopifyService implements IIntegrationService {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    try {
      return !!(this.config.credentials?.storeUrl && this.config.credentials?.accessToken);
    } catch {
      return false;
    }
  }

  async fetchOrders(dateFrom: Date, dateTo: Date): Promise<Partial<Order>[]> {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const mockOrders: Partial<Order>[] = [
      {
        id: `SHOP-${Math.floor(Math.random() * 10000)}`,
        customer: "Mike Johnson",
        seller: "Shopify Store",
        courier: "UPS",
        status: "Pending",
        amount: "$89.99",
        date: new Date().toISOString().split('T')[0],
        awb: "1Z" + Math.random().toString(36).substring(7).toUpperCase(),
        destination: "Los Angeles, CA",
        phone: "+1 213-555-0789",
        address: "789 Hollywood Blvd, Los Angeles, CA 90028",
        platform: "Shopify",
        platformOrderId: `#${Math.floor(Math.random() * 10000)}`
      },
      {
        id: `SHOP-${Math.floor(Math.random() * 10000)}`,
        customer: "Sarah Williams",
        seller: "Shopify Store",
        courier: "FedEx",
        status: "Shipped",
        amount: "$234.50",
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        awb: "FX" + Math.random().toString(36).substring(7).toUpperCase(),
        destination: "San Francisco, CA",
        phone: "+1 415-555-0234",
        address: "321 Market Street, San Francisco, CA 94105",
        platform: "Shopify",
        platformOrderId: `#${Math.floor(Math.random() * 10000)}`
      }
    ];

    return mockOrders;
  }
}