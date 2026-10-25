import { Router } from 'express'
import { SessionsController } from '@/modules/sessions/sessions.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()

router.use(authMiddleware, requireTenant)

router.get('/',                 requireRole('SUPER_ADMIN', 'ADMIN', 'STUDENT', 'OFFICER'), SessionsController.list)
router.get('/:id',              requireRole('SUPER_ADMIN', 'ADMIN'),                        SessionsController.getById)
router.post('/',                requireRole('SUPER_ADMIN', 'ADMIN'),                        SessionsController.create)
router.patch('/:id',            requireRole('SUPER_ADMIN', 'ADMIN'),                        SessionsController.update)
router.patch('/:id/activate',   requireRole('SUPER_ADMIN', 'ADMIN'),                        SessionsController.activate)
router.delete('/:id',           requireRole('SUPER_ADMIN', 'ADMIN'),                        SessionsController.delete)

export default router
