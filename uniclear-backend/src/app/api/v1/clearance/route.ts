import { Router } from 'express'
import multer from 'multer'
import { ClearanceController } from '@/modules/clearance/clearance.controller'
import { authMiddleware } from '@/core/middleware/auth.middleware'
import { requireRole, requireTenant } from '@/core/middleware/rbac.middleware'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Public verification endpoint for employers, institutions, and QR code scans
router.get('/verify/:clearanceNumber', ClearanceController.verify)

router.use(authMiddleware, requireTenant)

router.post('/start',                       requireRole('STUDENT'),                     ClearanceController.start)
router.get('/status',                       requireRole('STUDENT'),                     ClearanceController.getStatus)
router.get('/queue',                        requireRole('OFFICER'),                     ClearanceController.getQueue)
router.post('/approve',                      requireRole('OFFICER'),                     upload.single('file'), ClearanceController.approve)
router.post('/reject',                       requireRole('OFFICER'),                     ClearanceController.reject)
router.get('/by-student/:studentId',        requireRole('OFFICER', 'SUPER_ADMIN', 'ADMIN'), ClearanceController.getByStudent)
router.get('/:requestId',                   requireRole('OFFICER', 'SUPER_ADMIN', 'ADMIN'), ClearanceController.getById)
router.post('/:requestId/submit',           requireRole('STUDENT'),                     ClearanceController.submit)
router.post('/:requestId/approve',          requireRole('OFFICER'),                     upload.single('file'), ClearanceController.approve)
router.post('/:requestId/reject',           requireRole('OFFICER'),                     ClearanceController.reject)
router.get('/:requestId/history',           requireRole('SUPER_ADMIN', 'ADMIN', 'OFFICER', 'STUDENT'), ClearanceController.getHistory)
router.get('/:requestId/certificate',       requireRole('STUDENT', 'SUPER_ADMIN', 'ADMIN'), ClearanceController.getCertificate)
router.get('/:requestId/certificate/pdf',   requireRole('STUDENT', 'SUPER_ADMIN', 'ADMIN'), ClearanceController.downloadCertificatePdf)

export default router
