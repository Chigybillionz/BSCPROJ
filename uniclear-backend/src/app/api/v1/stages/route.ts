import { Router } from 'express'
import { StagesController } from '@/modules/stages/stages.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()

router.use(authMiddleware, requireTenant)

router.get('/',              requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER', 'STUDENT'), StagesController.list)
router.get('/:id',           requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER'),            StagesController.getById)
router.post('/',             requireRole('SUPER_ADMIN', 'ADMIN'),                       StagesController.create)
router.patch('/reorder',     requireRole('SUPER_ADMIN', 'ADMIN'),                       StagesController.reorder)
router.patch('/:id',         requireRole('SUPER_ADMIN', 'ADMIN'),                       StagesController.update)
router.patch('/:id/toggle',  requireRole('SUPER_ADMIN', 'ADMIN'),                       StagesController.toggle)
router.delete('/:id',        requireRole('SUPER_ADMIN', 'ADMIN'),                       StagesController.delete)

export default router
