import { Router } from 'express'
import { UniversitiesController } from '@/modules/universities/universities.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()

// Public — no auth required
router.get('/public',         UniversitiesController.getPublicList)
router.get('/branding/:slug', UniversitiesController.getPublicBranding)

router.get('/me', authMiddleware, requireTenant, UniversitiesController.getMe)

// Admin Settings
router.get('/settings/api-key',          authMiddleware, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), UniversitiesController.getApiKey)
router.post('/settings/api-key/generate', authMiddleware, requireTenant, requireRole('SUPER_ADMIN', 'ADMIN'), UniversitiesController.generateApiKey)

// Platform owner only
router.use(authMiddleware, requireRole('PLATFORM_OWNER'))
router.get('/',               UniversitiesController.list)
router.get('/stats',          UniversitiesController.getPlatformStats)
router.get('/:id',            UniversitiesController.getById)
router.post('/',              UniversitiesController.create)
router.patch('/:id',          UniversitiesController.update)
router.patch('/:id/suspend',  UniversitiesController.suspend)
router.patch('/:id/restore',  UniversitiesController.restore)
router.delete('/:id',         UniversitiesController.delete)
router.patch('/:id/contract', UniversitiesController.updateContract)

export default router
