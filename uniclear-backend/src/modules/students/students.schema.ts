import { z } from 'zod'

const optionalUuid = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().uuid().optional()
)

const optionalString = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  z.string().optional()
)

export const createStudentSchema = z.object({
  email:          z.string().email().optional(),
  jambRegNo:      z.string().min(1),
  matricNo:       optionalString,
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  facultyId:      optionalUuid,
  departmentId:   optionalUuid,
  entrySessionId: optionalUuid,
  level:          optionalString,
  phone:          optionalString,
})

export const bulkCreateItemSchema = z.object({
  email:          z.string().email().optional(),
  jambRegNo:      z.string().min(1),
  firstName:      z.string().min(1),
  lastName:       z.string().min(1),
  facultyName:    z.string().optional(),
  departmentName: z.string().optional(),
  sessionName:    z.string().optional(),
  level:          z.string().optional(),
})

export const bulkCreateStudentSchema = z.array(bulkCreateItemSchema)

export const updateStudentSchema = z.object({
  firstName:    z.string().min(1).optional(),
  lastName:     z.string().min(1).optional(),
  jambRegNo:    z.string().min(1).optional(),
  matricNo:     optionalString,
  facultyId:    optionalUuid,
  departmentId: optionalUuid,
  level:        optionalString,
  phone:        optionalString,
})

export const listStudentsSchema = z.object({
  page:         z.coerce.number().default(1),
  limit:        z.coerce.number().default(20),
  search:       optionalString,
  facultyId:    optionalUuid,
  departmentId: optionalUuid,
})
