import { z } from "zod";

export const OrderSummary = z.object({
  id: z.string().uuid().describe("Order identifier"),
  orderNo: z.string().min(1).max(32).describe("Human-readable order number"),
  status: z.enum(["pending", "paid", "shipped", "cancelled"]).describe("Order lifecycle status"),
  totalAmount: z.number().int().nonnegative().describe("Total amount in yen"),
});

export const CustomerSummary = z.object({
  id: z.string().uuid().describe("Customer identifier"),
  name: z.string().min(1).max(80).describe("Customer display name"),
});

export const OrderItem = z.object({
  productId: z.string().uuid().describe("Product identifier"),
  productName: z.string().min(1).max(120).describe("Product name"),
  quantity: z.number().int().min(1).max(99).describe("Ordered quantity"),
  unitPrice: z.number().int().nonnegative().describe("Unit price in yen"),
});

export const OrderDetail = z.object({
  id: z.string().uuid().describe("Order identifier"),
  orderNo: z.string().min(1).max(32).describe("Human-readable order number"),
  status: z.enum(["pending", "paid", "shipped", "cancelled"]).describe("Order lifecycle status"),
  totalAmount: z.number().int().nonnegative().describe("Total amount in yen"),
  customer: z.object({}).describe("Customer summary"),
  items: z.array(z.object({})).min(1).describe("Order items"),
  createdAt: z.string().datetime().describe("Creation timestamp"),
});

export const OrderListResponse = z.object({
  items: z.array(OrderSummary),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});

export const OrderItemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const OrderCreateRequest = z.object({
  customerId: z.string().uuid(),
  items: z.array(OrderItemInput).min(1).max(20),
});

export const CancelOrderRequest = z.object({
  reason: z.string().min(1).max(240).describe("Cancellation reason"),
});
