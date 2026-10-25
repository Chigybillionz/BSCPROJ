import { z } from 'zod'

const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional()
)

export const createOfficerSchema = z.object({
  email:        z.string().email(),
  firstName:    z.string().min(1, 'First name is required'),
  lastName:     z.string().min(1, 'Last name is required'),
  role:         z.enum(['OFFICER', 'ADMIN']).default('OFFICER').optional(),
  stageId:      optionalUuid,
  facultyId:    optionalUuid,
  departmentId: optionalUuid,
  sessionId:    optionalUuid,
})

export const updateOfficerSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName:  z.string().min(1).optional(),
})

export const listOfficersSchema = z.object({
  page:  z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
})

export const assignOfficerSchema = z.object({
  officerId:    z.string().uuid(),
  facultyId:    optionalUuid,
  departmentId: optionalUuid,
  sessionId:    optionalUuid,
})
