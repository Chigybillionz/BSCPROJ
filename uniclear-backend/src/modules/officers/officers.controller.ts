import { Request, Response, NextFunction } from 'express'
import { OfficersService } from './officers.service'
import { OfficersRepository } from './officers.repository'
import { ApiResponse } from '@/core/response/ApiResponse'
import { NotFoundError, ValidationError } from '@/core/errors/AppError'
import { createOfficerSchema, updateOfficerSchema, listOfficersSchema, assignOfficerSchema, assignMultipleStagesSchema } from './officers.schema'
import { param } from '@/lib/utils/param'
import { storage } from '@/modules/documents/storage'
import { db } from '@/lib/db'
import { AuditService } from '@/modules/audit/audit.service'

export class OfficersController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const officer = await OfficersRepository.findByUserId(req.user!.sub)
      if (!officer) throw new NotFoundError('Officer profile not found')
      const full = await OfficersService.getById(officer.id, req.universityId!)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayVelocity = await db.stageApproval.count({
        where: {
          officerId: req.user!.sub,
          decidedAt: { gte: today },
        }
      })
      
      return ApiResponse.success(res, { ...full, todayVelocity })
    } catch (err) { next(err) }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listOfficersSchema.parse(req.query)
      const { data, total } = await OfficersService.list(req.universityId!, query)
      return ApiResponse.paginated(res, data, total, query.page, query.limit)
    } catch (err) { next(err) }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const officer = await OfficersService.getById(param(req.params.id), req.universityId!)
      return ApiResponse.success(res, officer)
    } catch (err) { next(err) }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createOfficerSchema.parse(req.body)
      const officer = await OfficersService.create(req.universityId!, data)
      if (req.user?.sub && req.universityId) {
        AuditService.log({
          universityId: req.universityId,
          actorId: req.user.sub,
          action: 'OFFICER_CREATED',
          targetId: officer.id,
          targetType: 'Officer',
          metadata: { email: data.email, role: data.role || 'OFFICER' },
          ipAddress: req.ip,
        }).catch(() => {})
      }
      return ApiResponse.created(res, officer)
    } catch (err) { next(err) }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateOfficerSchema.parse(req.body)
      const officer = await OfficersService.update(param(req.params.id), req.universityId!, data)
      return ApiResponse.success(res, officer)
    } catch (err) { next(err) }
  }

  static async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const { officerId, facultyId, departmentId, sessionId } = assignOfficerSchema.parse(req.body)
      const result = await OfficersService.assign(param(req.params.stageId), req.universityId!, officerId, facultyId, departmentId, sessionId)
      if (req.user?.sub && req.universityId) {
        AuditService.log({
          universityId: req.universityId,
          actorId: req.user.sub,
          action: 'STAGE_OFFICER_ASSIGNED',
          targetId: officerId,
          targetType: 'StageOfficerAssignment',
          metadata: { stageId: req.params.stageId },
          ipAddress: req.ip,
        }).catch(() => {})
      }
      return ApiResponse.created(res, result)
    } catch (err) { next(err) }
  }

  static async assignMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const { officerId, stageIds, facultyId, departmentId, sessionId } = assignMultipleStagesSchema.parse(req.body)
      const results = await OfficersService.assignMultiple(stageIds, req.universityId!, officerId, facultyId, departmentId, sessionId)
      if (req.user?.sub && req.universityId) {
        AuditService.log({
          universityId: req.universityId,
          actorId: req.user.sub,
          action: 'STAGE_OFFICER_ASSIGNED_MULTIPLE',
          targetId: officerId,
          targetType: 'StageOfficerAssignment',
          metadata: { stageIds, count: stageIds.length },
          ipAddress: req.ip,
        }).catch(() => {})
      }
      return ApiResponse.created(res, results)
    } catch (err) { next(err) }
  }

  static async unassign(req: Request, res: Response, next: NextFunction) {
    try {
      await OfficersService.unassign(param(req.params.assignmentId))
      if (req.user?.sub && req.universityId) {
        AuditService.log({
          universityId: req.universityId,
          actorId: req.user.sub,
          action: 'STAGE_OFFICER_UNASSIGNED',
          targetId: req.params.assignmentId,
          targetType: 'StageOfficerAssignment',
          ipAddress: req.ip,
        }).catch(() => {})
      }
      return ApiResponse.noContent(res)
    } catch (err) { next(err) }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await OfficersService.delete(param(req.params.id), req.universityId!)
      return ApiResponse.noContent(res)
    } catch (err) { next(err) }
  }

  static async getStamps(req: Request, res: Response, next: NextFunction) {
    try {
      const stamps = await db.officerStamp.findMany({
        where: { officerId: req.user!.sub, universityId: req.universityId! }
      })
      return ApiResponse.success(res, stamps)
    } catch (err) { next(err) }
  }

  static async uploadStamp(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new ValidationError('No image uploaded')
      const allowedMimes = ['image/png', 'image/jpeg', 'image/webp']
      if (!allowedMimes.includes(req.file.mimetype)) {
        throw new ValidationError('Invalid stamp file format. Only PNG, JPEG, and WebP are allowed')
      }
      const MAX_SIZE = 5 * 1024 * 1024 // 5MB
      if (req.file.size > MAX_SIZE) {
        throw new ValidationError('Stamp image exceeds maximum allowed size (5MB)')
      }

      const { name } = req.body
      if (!name) throw new ValidationError('Stamp name is required')
      
      const fileData = await storage.upload(req.file.buffer, `stamps/${req.universityId}/${req.user!.sub}`, req.file.mimetype)
      const stamp = await db.officerStamp.create({
        data: {
          universityId: req.universityId!,
          officerId: req.user!.sub,
          name,
          imageUrl: fileData.url,
          imageKey: fileData.key
        }
      })
      return ApiResponse.created(res, stamp)
    } catch (err) { next(err) }
  }

  static async deleteStamp(req: Request, res: Response, next: NextFunction) {
    try {
      const stamp = await db.officerStamp.findUnique({ where: { id: req.params.id } })
      if (!stamp || stamp.officerId !== req.user!.sub || stamp.universityId !== req.universityId) throw new NotFoundError('Stamp not found')
      await storage.delete(stamp.imageKey)
      await db.officerStamp.delete({ where: { id: req.params.id } })
      return ApiResponse.noContent(res)
    } catch (err) { next(err) }
  }
}
