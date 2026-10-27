import { SessionsRepository } from './sessions.repository'
import { NotFoundError, TierLimitError, ValidationError } from '@/core/errors/AppError'
import { db } from '@/lib/db'
import { TIER_LIMITS } from '@/lib/constants/tiers'

export class SessionsService {
  static async list(universityId: string) {
    return SessionsRepository.findAll(universityId)
  }

  static async getById(id: string, universityId: string) {
    const session = await SessionsRepository.findById(id, universityId)
    if (!session) throw new NotFoundError('Session not found')
    return session
  }

  static async create(universityId: string, data: { name: string; startDate: Date; endDate: Date }) {
    const contract = await db.contractPlan.findUnique({ where: { universityId } })
    const tier = contract?.tier ?? 'TRIAL'
    if (!TIER_LIMITS[tier].multiSession) {
      const existing = await SessionsRepository.findAll(universityId)
      if (existing.length >= 1) throw new TierLimitError('Multiple sessions not available on your plan')
    }
    return SessionsRepository.create({ universityId, ...data })
  }

  static async update(id: string, universityId: string, data: { name?: string; startDate?: Date; endDate?: Date }) {
    await SessionsService.getById(id, universityId)
    return SessionsRepository.update(id, data)
  }

  static async activate(id: string, universityId: string) {
    await SessionsService.getById(id, universityId)
    return SessionsRepository.activate(id, universityId)
  }

  static async delete(id: string, universityId: string) {
    await SessionsService.getById(id, universityId)
    const activeRequests = await db.clearanceRequest.count({ where: { sessionId: id } })
    if (activeRequests > 0) {
      throw new ValidationError(`Cannot delete session: ${activeRequests} clearance request(s) are linked to it`)
    }
    return SessionsRepository.delete(id)
  }
}
