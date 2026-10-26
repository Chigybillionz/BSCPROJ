import { Router } from 'express'
import multer from 'multer'
import { CampaignsController } from '@/modules/campaigns/campaigns.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(authMiddleware, requireTenant)

router.get('/',               requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER'), CampaignsController.list)
router.get('/active',         requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER', 'STUDENT'), CampaignsController.listActive)
router.post('/',              requireRole('SUPER_ADMIN', 'ADMIN'), CampaignsController.create)
router.patch('/:id',          requireRole('SUPER_ADMIN', 'ADMIN'), CampaignsController.update)
router.patch('/:id/toggle',   requireRole('SUPER_ADMIN', 'ADMIN'), CampaignsController.toggle)
router.post('/:id/certificate', requireRole('SUPER_ADMIN', 'ADMIN'), upload.single('file'), CampaignsController.uploadCertificateTemplate)
router.delete('/:id',         requireRole('SUPER_ADMIN', 'ADMIN'), CampaignsController.delete)

export default router
