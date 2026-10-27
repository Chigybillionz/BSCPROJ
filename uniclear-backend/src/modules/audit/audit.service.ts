import { AuditRepository } from './audit.repository'

export class AuditService {
  static async log(data: { universityId: string; actorId: string; action: string; targetId?: string; targetType?: string; metadata?: object; ipAddress?: string }) {
    return AuditRepository.log(data)
  }

  static async list(universityId: string, opts: { page: number; limit: number; actorId?: string; targetId?: string; action?: string; search?: string }) {
    return AuditRepository.findAll(universityId, opts)
  }
}
