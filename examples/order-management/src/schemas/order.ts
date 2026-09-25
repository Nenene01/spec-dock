import { z } from "zod";

export const OrderSummary = z.object({
  id: z.string().uuid().describe("注文ID"),
  orderNo: z.string().min(1).max(32).describe("注文番号"),
  status: z.enum(["pending", "paid", "shipped", "cancelled"]).describe("注文状態"),
  totalAmount: z.number().int().nonnegative().describe("合計金額（円）"),
});

export const CustomerSummary = z.object({
  id: z.string().uuid().describe("顧客ID"),
  name: z.string().min(1).max(80).describe("顧客名"),
});

export const OrderItem = z.object({
  productId: z.string().uuid().describe("商品ID"),
  productName: z.string().min(1).max(120).describe("商品名"),
  quantity: z.number().int().min(1).max(99).describe("注文数量"),
  unitPrice: z.number().int().nonnegative().describe("単価（円）"),
});

export const OrderDetail = z.object({
  id: z.string().uuid().describe("Order identifier"),
  orderNo: z.string().min(1).max(32).describe("Human-readable order number"),
  status: z.enum(["pending", "paid", "shipped", "cancelled"]).describe("Order lifecycle status"),
  totalAmount: z.number().int().nonnegative().describe("Total amount in yen"),
  customer: z.object({}).describe("顧客概要"),
  items: z.array(z.object({})).min(1).describe("注文明細"),
  createdAt: z.string().datetime().describe("作成日時"),
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
  reason: z.string().min(1).max(240).describe("キャンセル理由"),
});
