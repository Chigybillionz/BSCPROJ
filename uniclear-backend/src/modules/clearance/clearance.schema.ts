import { z } from 'zod'

export const startClearanceSchema = z.object({
  sessionId: z.string().uuid(),
  campaignId: z.string().uuid(),
})

export const approveStageSchema = z.object({
  remarks: z.string().optional(),
  issuedData: z.union([z.string(), z.record(z.any())]).optional(),
  stampId: z.string().uuid().optional(),
})

export const rejectStageSchema = z.object({
  remarks: z.string().min(10, 'Please provide a detailed rejection reason (min 10 chars)'),
})

export const queueQuerySchema = z.object({
  page:   z.coerce.number().default(1),
  limit:  z.coerce.number().default(20),
  search: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  stageStatus: z.enum(['ALL', 'SUBMITTED', 'PENDING', 'REJECTED']).optional(),
})
