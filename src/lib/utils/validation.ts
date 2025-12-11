/**
 * Validation utilities and Zod schemas
 */

import { z } from "zod";

/**
 * Sales lead validation schema
 */
export const SalesLeadSchema = z.object({
  id: z.string(),
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  currentPrice: z.number().min(0),
  status: z.enum(["Closed", "Appointment Booked", "Not Interested"]),
  priceSoldAt: z.number().min(0).optional(),
  upsellAmount: z.number().min(0).optional(),
  upsellDescription: z.string().optional(),
  closedDate: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  source: z.string().optional(),
  salesRep: z.string().optional(),
  followUpCount: z.number().min(0).optional(),
  responseTime: z.number().min(0).optional(),
  meetingDuration: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  winReason: z.string().optional(),
  lossReason: z.string().optional(),
  appointmentDate: z.number().optional(),
  quoteSentDate: z.number().optional(),
  quoteAcceptedDate: z.number().optional(),
  isRepeatCustomer: z.boolean().optional(),
  companySize: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Payment request validation schema
 */
export const PaymentRequestSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    price: z.number().min(0),
    quantity: z.number().min(1).default(1),
  })).optional(),
});

/**
 * Validate data against schema and return result
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const issues = (zodError as any).issues || (zodError as any).errors || [];
      return {
        success: false,
        error: issues.map((e: any) => `${e.path?.join(".") || ""}: ${e.message || ""}`).join(", "),
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}


