import { Router } from 'express'
import { db } from '@/lib/db'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireTenant, requireRole } from '@/core/middleware/rbac.middleware'
import { ApiResponse } from '@/core/response/ApiResponse'

const router = Router()

// Helper to resolve universityId from req or query
async function resolveUniversityId(req: any): Promise<string | null> {
  if (req.universityId) return req.universityId
  const slug = (req.query.tenant as string) || (req.query.slug as string) || (req.query.universitySlug as string)
  if (slug) {
    const uni = await db.university.findFirst({
      where: { OR: [{ slug }, { id: slug }], isActive: true },
      select: { id: true },
    })
    if (uni) return uni.id
  }
  const defaultUni = await db.university.findFirst({ where: { isActive: true }, select: { id: true } })
  return defaultUni?.id ?? null
}

// ── Public Structure (for student registration & public views) ──
router.get('/public', async (req, res, next) => {
  try {
    const universityId = await resolveUniversityId(req)
    if (!universityId) return ApiResponse.success(res, [])

    const data = await db.faculty.findMany({
      where: { universityId },
      include: {
        departments: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })
    return ApiResponse.success(res, data)
  } catch (err) { next(err) }
})

router.get('/faculties', async (req, res, next) => {
  try {
    const universityId = await resolveUniversityId(req)
    if (!universityId) return ApiResponse.success(res, [])

    const data = await db.faculty.findMany({ 
      where: { universityId },
      orderBy: { name: 'asc' },
    })
    return ApiResponse.success(res, data)
  } catch (err) { next(err) }
})

router.get('/departments', async (req, res, next) => {
  try {
    const universityId = await resolveUniversityId(req)
    if (!universityId) return ApiResponse.success(res, [])

    const facultyId = req.query.facultyId as string | undefined
    const where: any = { faculty: { universityId } }
    if (facultyId) where.facultyId = facultyId

    const data = await db.department.findMany({ 
      where,
      orderBy: { name: 'asc' },
    })
    return ApiResponse.success(res, data)
  } catch (err) { next(err) }
})

// ── Protected Admin Routes ──
router.post('/faculties', authMiddleware, requireTenant, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const data = await db.faculty.create({ data: { name: req.body.name, universityId: req.universityId! } })
    return ApiResponse.success(res, data, 'Created', 201)
  } catch (err) { next(err) }
})

router.delete('/faculties/:id', authMiddleware, requireTenant, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await db.faculty.delete({ where: { id: req.params.id } })
    return ApiResponse.success(res, { deleted: true })
  } catch (err) { next(err) }
})

router.post('/departments', authMiddleware, requireTenant, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { name, facultyId, availableLevels } = req.body
    const data = await db.department.create({ 
      data: { 
        name, 
        facultyId,
        ...(availableLevels && Array.isArray(availableLevels) ? { availableLevels } : {}),
      },
    })
    return ApiResponse.success(res, data, 'Created', 201)
  } catch (err) { next(err) }
})

router.delete('/departments/:id', authMiddleware, requireTenant, requireRole('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await db.department.delete({ where: { id: req.params.id } })
    return ApiResponse.success(res, { deleted: true })
  } catch (err) { next(err) }
})

export default router
