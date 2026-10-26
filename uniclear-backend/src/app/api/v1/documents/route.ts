import { Router } from 'express'
import multer from 'multer'
import { DocumentsController } from '@/modules/documents/document.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router  = Router()
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

router.use(authMiddleware, requireTenant)

router.get('/request/:requestId',              requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER', 'STUDENT'), DocumentsController.getByRequest)
router.get('/request/:requestId/stage/:stageId', requireRole('OFFICER', 'SUPER_ADMIN', 'ADMIN'),          DocumentsController.getByStage)
router.post('/upload',                         requireRole('STUDENT'), upload.single('file'),              DocumentsController.upload)
router.get('/:id/url',                         requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER', 'STUDENT'), DocumentsController.getSignedUrl)
router.patch('/:id/approve',                   requireRole('OFFICER', 'SUPER_ADMIN', 'ADMIN'),    DocumentsController.approveDocument)
router.patch('/:id/reject',                    requireRole('OFFICER', 'SUPER_ADMIN', 'ADMIN'),    DocumentsController.rejectDocument)
router.delete('/:id',                          requireRole('STUDENT', 'SUPER_ADMIN', 'ADMIN'),    DocumentsController.delete)

export default router
