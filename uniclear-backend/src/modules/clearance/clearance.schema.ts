import { z } from 'zod'

const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional()
)

export const startClearanceSchema = z.object({
  sessionId: z.string().uuid(),
  campaignId: z.string().uuid(),
})

export const approveStageSchema = z.object({
  remarks: z.string().optional(),
  issuedData: z.union([z.string(), z.record(z.any())]).optional(),
  stampId: optionalUuid,
})

export const rejectStageSchema = z.object({
  remarks: z.string().min(10, 'Please provide a detailed rejection reason (min 10 chars)'),
})

export const queueQuerySchema = z.object({
  page:   z.coerce.number().default(1),
  limit:  z.coerce.number().default(20),
  search: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().optional()
  ),
  sessionId: optionalUuid,
  campaignId: optionalUuid,
  stageStatus: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.enum(['ALL', 'SUBMITTED', 'PENDING', 'REJECTED', 'APPROVED']).optional()
  ),
})

