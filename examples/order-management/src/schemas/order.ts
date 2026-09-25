import { z } from "zod";

export const OrderResponse = z.object({
  id: z.string().uuid().describe("Order identifier"),
  orderNo: z.string().describe("Human-readable order number"),
  customerName: z.string().describe("Customer display name"),
});
