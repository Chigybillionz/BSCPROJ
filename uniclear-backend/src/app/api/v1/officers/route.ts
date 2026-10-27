import { Router } from 'express'
import multer from 'multer'
import { OfficersController } from '@/modules/officers/officers.controller'
import { ClearanceController } from '@/modules/clearance/clearance.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(authMiddleware, requireTenant)

router.get('/me',                    requireRole('OFFICER'),             OfficersController.getMe)
router.get('/queue',                 requireRole('OFFICER'),             ClearanceController.getQueue)
router.get('/stamps',                requireRole('OFFICER'),             OfficersController.getStamps)
router.post('/stamps',               requireRole('OFFICER'),             upload.single('file'), OfficersController.uploadStamp)
router.delete('/stamps/:id',         requireRole('OFFICER'),             OfficersController.deleteStamp)
router.post('/stage/:stageId/assign',         requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.assign)
router.post('/assign-stages',                  requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.assignMultiple)
router.delete('/assignment/:assignmentId',    requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.unassign)
router.get('/',                      requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.list)
router.get('/:id',                   requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.getById)
router.post('/',                     requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.create)
router.patch('/:id',                 requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.update)
router.delete('/:id',                requireRole('SUPER_ADMIN', 'ADMIN'), OfficersController.delete)

export default router
