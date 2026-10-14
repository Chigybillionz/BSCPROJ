import { Request, Response, NextFunction } from 'express'
import { ClearanceService } from './clearance.service'
import { ApiResponse } from '@/core/response/ApiResponse'
import { startClearanceSchema, approveStageSchema, rejectStageSchema, queueQuerySchema } from './clearance.schema'
import { param } from '@/lib/utils/param'

export class ClearanceController {
  static async start(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, campaignId } = startClearanceSchema.parse(req.body)
      const result = await ClearanceService.start(req.user!.sub, req.universityId!, sessionId, campaignId)
      return ApiResponse.created(res, result)
    } catch (err) { next(err) }
  }

  static async getByStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await ClearanceService.getByStudentId(param(req.params.studentId), req.universityId!)
      return ApiResponse.success(res, status)
    } catch (err) { next(err) }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const clearance = await ClearanceService.getById(param(req.params.requestId), req.universityId!)
      return ApiResponse.success(res, clearance)
    } catch (err) { next(err) }
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await ClearanceService.getStatus(req.user!.sub, req.universityId!)
      return ApiResponse.success(res, status)
    } catch (err) { next(err) }
  }

  static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ClearanceService.submit(param(req.params.requestId), req.user!.sub, req.universityId!)
      return ApiResponse.success(res, result, 'Submitted for review')
    } catch (err) { next(err) }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = param(req.params.requestId || req.body.requestId || '')
      const { remarks, issuedData, stampId } = approveStageSchema.parse(req.body)
      let parsedIssuedData = undefined
      if (issuedData) {
        parsedIssuedData = typeof issuedData === 'string' ? JSON.parse(issuedData) : issuedData
      }

      let attachmentUrl = undefined
      let attachmentKey = undefined

      if (req.file) {
        const { storage } = await import('@/modules/documents/storage')
        const fileData = await storage.upload(req.file.buffer, `approvals/${req.universityId}/${requestId}`, req.file.mimetype)
        attachmentUrl = fileData.url
        attachmentKey = fileData.key
      }

      const result = await ClearanceService.approve(
        requestId,
        req.user!.sub,
        req.universityId!,
        remarks,
        attachmentUrl,
        attachmentKey,
        req.ip,
        parsedIssuedData,
        stampId
      )
      return ApiResponse.success(res, result, 'Stage approved')
    } catch (err) { next(err) }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = param(req.params.requestId || req.body.requestId || '')
      const { remarks } = rejectStageSchema.parse(req.body)
      const result = await ClearanceService.reject(requestId, req.user!.sub, req.universityId!, remarks, req.ip)
      return ApiResponse.success(res, result, 'Stage rejected')
    } catch (err) { next(err) }
  }

  static async getQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queueQuerySchema.parse(req.query)
      const { data, total } = await ClearanceService.getQueue(req.user!.sub, req.universityId!, query)
      return ApiResponse.paginated(res, data, total, query.page, query.limit)
    } catch (err) { next(err) }
  }

  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await ClearanceService.getHistory(param(req.params.requestId), req.universityId!)
      return ApiResponse.success(res, history)
    } catch (err) { next(err) }
  }

  static async getCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const clearance = await ClearanceService.getCertificate(param(req.params.requestId), req.universityId!)
      return ApiResponse.success(res, clearance)
    } catch (err) { next(err) }
  }
}
