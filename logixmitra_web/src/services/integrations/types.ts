import { Order, Platform } from "@/types/order";

export interface IIntegrationService {
  fetchOrders(dateFrom: Date, dateTo: Date): Promise<Partial<Order>[]>;
  testConnection(): Promise<boolean>;
}

export { Platform, type Order, type IntegrationConfig, type SyncResult } from "@/types/order";