import { z } from 'zod'

const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional()
)

export const createStageSchema = z.object({
  campaignId:  optionalUuid,
  name:        z.string().min(1, 'Stage name is required'),
  description: z.string().optional(),
  orderIndex:  z.number().int().min(1).optional(),
  scope:       z.enum(['UNIVERSITY', 'FACULTY', 'DEPARTMENT']).optional(),
})

export const updateStageSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().optional(),
  scope:       z.enum(['UNIVERSITY', 'FACULTY', 'DEPARTMENT']).optional(),
  orderIndex:  z.number().int().min(1).optional(),
  isActive:    z.boolean().optional(),
})

export const reorderStagesSchema = z.object({
  stages: z.array(z.object({ id: z.string().min(1), orderIndex: z.number().int().min(1) })),
})
