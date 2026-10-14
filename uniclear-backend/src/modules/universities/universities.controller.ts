import { Request, Response, NextFunction } from 'express'
import { UniversitiesService } from './universities.service'
import { UniversitiesRepository } from './universities.repository'
import { ApiResponse } from '@/core/response/ApiResponse'
import { createUniversitySchema, updateUniversitySchema, updateContractSchema } from './universities.schema'
import { z } from 'zod'
import { param } from '@/lib/utils/param'

const listSchema = z.object({ page: z.coerce.number().default(1), limit: z.coerce.number().default(20), search: z.string().optional() })

export class UniversitiesController {
  static async getPublicBranding(req: Request, res: Response, next: NextFunction) {
    try {
      const uni = await UniversitiesRepository.findBySlug(req.params.slug)
      if (!uni || !uni.isActive) return ApiResponse.success(res, null)
      return ApiResponse.success(res, {
        name:         uni.name,
        slug:         uni.slug,
        logoUrl:      uni.logoUrl,
        primaryColor: uni.primaryColor,
        accentColor:  uni.accentColor,
        loginBgUrl:   uni.branding?.loginBgUrl ?? null,
        certificateTemplateUrl: uni.branding?.certificateTemplateUrl ?? null,
        certificateCoordinates: uni.branding?.certificateCoordinates ?? null,
      })
    } catch (err) { next(err) }
  }

  static async getPublicList(req: Request, res: Response, next: NextFunction) {
    try {
      const { db } = await import('@/lib/db')
      const data = await db.university.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          abbreviation: true,
          logoUrl: true,
          primaryColor: true,
          accentColor: true,
        },
        orderBy: { name: 'asc' },
      })
      return ApiResponse.success(res, data)
    } catch (err) { next(err) }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const uni = await UniversitiesService.getById(req.universityId!)
      return ApiResponse.success(res, uni)
    } catch (err) { next(err) }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = listSchema.parse(req.query)
      const { data, total } = await UniversitiesService.list(page, limit, search)
      return ApiResponse.paginated(res, data, total, page, limit)
    } catch (err) { next(err) }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const uni = await UniversitiesService.getById(param(req.params.id))
      return ApiResponse.success(res, uni)
    } catch (err) { next(err) }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createUniversitySchema.parse(req.body)
      const uni = await UniversitiesService.create(data)
      return ApiResponse.created(res, uni)
    } catch (err) { next(err) }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateUniversitySchema.parse(req.body)
      const uni = await UniversitiesService.update(param(req.params.id), data)
      return ApiResponse.success(res, uni)
    } catch (err) { next(err) }
  }

  static async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      await UniversitiesService.suspend(param(req.params.id))
      return ApiResponse.success(res, null, 'University suspended')
    } catch (err) { next(err) }
  }

  static async restore(req: Request, res: Response, next: NextFunction) {
    try {
      await UniversitiesService.restore(param(req.params.id))
      return ApiResponse.success(res, null, 'University restored')
    } catch (err) { next(err) }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await UniversitiesService.delete(param(req.params.id))
      return ApiResponse.noContent(res)
    } catch (err) { next(err) }
  }

  static async updateContract(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateContractSchema.parse(req.body)
      const contract = await UniversitiesService.updateContract(param(req.params.id), data)
      return ApiResponse.success(res, contract)
    } catch (err) { next(err) }
  }

  static async getApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UniversitiesService.getApiKey(req.universityId!)
      return ApiResponse.success(res, data)
    } catch (err) { next(err) }
  }

  static async generateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UniversitiesService.generateApiKey(req.universityId!)
      return ApiResponse.success(res, data, 'API Key generated successfully')
    } catch (err) { next(err) }
  }

  static async getPlatformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UniversitiesService.getPlatformStats()
      return ApiResponse.success(res, data)
    } catch (err) { next(err) }
  }
}
