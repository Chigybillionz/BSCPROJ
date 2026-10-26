import { Router } from 'express'
import multer from 'multer'
import { BrandingController } from '@/modules/branding/branding.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.use(authMiddleware, requireTenant)

router.get('/',                requireRole('SUPER_ADMIN', 'ADMIN'),  BrandingController.get)
router.patch('/',              requireRole('SUPER_ADMIN', 'ADMIN'),  BrandingController.update)
router.post('/logo',           requireRole('SUPER_ADMIN', 'ADMIN'),  upload.single('file'), BrandingController.uploadLogo)
router.post('/login-bg',       requireRole('SUPER_ADMIN', 'ADMIN'),  upload.single('file'), BrandingController.uploadLoginBg)

export default router
