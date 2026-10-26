import { z } from 'zod'

const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional()
)

export const createDocTypeSchema = z.object({
  name:           z.string().min(1),
  description:    z.string().optional(),
  isRequired:     z.boolean().default(true),
  allowedFormats: z.array(z.string()).default(['pdf', 'jpg', 'png']),
  maxFileSizeMB:  z.number().int().min(1).max(50).default(5),
  order:          z.number().int().default(0),
  stageId:        optionalUuid,
})

export const updateDocTypeSchema = z.object({
  name:           z.string().min(1).optional(),
  description:    z.string().optional(),
  isRequired:     z.boolean().optional(),
  allowedFormats: z.array(z.string()).optional(),
  maxFileSizeMB:  z.number().int().min(1).max(50).optional(),
  order:          z.number().int().optional(),
})

export const assignStageSchema = z.object({
  stageId:    z.string().uuid(),
  isRequired: z.boolean().default(true),
})
