import { Router } from 'express'
import { DocumentTypesController } from '@/modules/document-types/document-types.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()

router.use(authMiddleware, requireTenant)

router.get('/',                              requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER', 'STUDENT'), DocumentTypesController.list)
router.get('/:id',                           requireRole('SUPER_ADMIN', 'ADMIN'),                       DocumentTypesController.getById)
router.post('/',                             requireRole('SUPER_ADMIN', 'ADMIN'), DocumentTypesController.create)
router.patch('/:id',                         requireRole('SUPER_ADMIN', 'ADMIN'), DocumentTypesController.update)
router.patch('/:id/toggle',                  requireRole('SUPER_ADMIN', 'ADMIN'), DocumentTypesController.toggle)
router.delete('/:id',                        requireRole('SUPER_ADMIN', 'ADMIN'), DocumentTypesController.delete)
router.post('/:id/assign-stage',             requireRole('SUPER_ADMIN', 'ADMIN'), DocumentTypesController.assignToStage)
router.delete('/:id/assign-stage/:stageId',  requireRole('SUPER_ADMIN', 'ADMIN'), DocumentTypesController.removeFromStage)

export default router
