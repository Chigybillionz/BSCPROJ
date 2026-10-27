import { Request, Response, NextFunction } from 'express'
import { AuditService } from './audit.service'
import { ApiResponse } from '@/core/response/ApiResponse'
import { z } from 'zod'

const querySchema = z.object({
  page:     z.coerce.number().default(1),
  limit:    z.coerce.number().default(20),
  actorId:  z.string().uuid().optional(),
  targetId: z.string().uuid().optional(),
  action:   z.string().optional(),
  search:   z.string().optional(),
})

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = querySchema.parse(req.query)
      const { data, total } = await AuditService.list(req.universityId!, query)
      return ApiResponse.paginated(res, data, total, query.page, query.limit)
    } catch (err) { next(err) }
  }
}
