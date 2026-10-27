import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { OfficersRepository } from './officers.repository'
import { ConflictError, NotFoundError, TierLimitError } from '@/core/errors/AppError'
import { TIER_LIMITS } from '@/lib/constants/tiers'
import { AuthRepository } from '@/modules/auth/auth.repository'
import { logger } from '@/core/logger/logger'
import { sendInviteEmail } from '@/modules/notifications/channels/email.channel'
import { env } from '@/core/config/env'

export class OfficersService {
  static async list(universityId: string, opts: { page: number; limit: number }) {
    return OfficersRepository.findAll(universityId, opts)
  }

  static async getById(id: string, universityId: string) {
    const officer = await OfficersRepository.findById(id, universityId)
    if (!officer) throw new NotFoundError('Officer not found')
    return officer
  }

  static async create(universityId: string, data: {
    email: string
    firstName: string
    lastName: string
    role?: 'OFFICER' | 'ADMIN'
    stageId?: string
    stageIds?: string[]
    facultyId?: string
    departmentId?: string
    sessionId?: string
  }) {
    const contract = await db.contractPlan.findUnique({ where: { universityId } })
    const tier = contract?.tier ?? 'TRIAL'
    const limit = TIER_LIMITS[tier].maxOfficers
    const count = await OfficersRepository.count(universityId)
    if (count >= limit) throw new TierLimitError(`Officer limit (${limit}) reached for your plan`)

    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictError('Email already in use')

    const role = data.role ?? 'OFFICER'
    const tempPassword = crypto.randomBytes(4).toString('hex')
    const tempHash = await bcrypt.hash(tempPassword, 12)
    const user = await db.user.create({
      data: { email: data.email, passwordHash: tempHash, role, universityId },
    })

    const token = crypto.randomBytes(32).toString('hex')
    await AuthRepository.saveInviteToken(user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

    const inviteLink = `${env.APP_URL}/set-password?token=${token}`

    await sendInviteEmail({
      to: data.email,
      name: `${data.firstName} ${data.lastName}`,
      role: role === 'ADMIN' ? 'Administrator' : 'Officer',
      inviteLink,
      tempPassword,
    })

    logger.info({ email: data.email, inviteLink }, 'Officer invite created')
    const officer = await OfficersRepository.create(universityId, user.id, { firstName: data.firstName, lastName: data.lastName })

    const stageIdsToAssign = data.stageIds && data.stageIds.length > 0
      ? data.stageIds
      : data.stageId ? [data.stageId] : []

    let stageAssignments: any[] = []
    if (stageIdsToAssign.length > 0) {
      stageAssignments = await OfficersRepository.assignMultiple(
        universityId,
        stageIdsToAssign,
        officer.id,
        data.facultyId,
        data.departmentId,
        data.sessionId
      )
    }

    return {
      ...officer,
      user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive },
      stageAssignments,
      inviteLink,
      tempPassword,
    }
  }

  static async update(id: string, universityId: string, data: { firstName?: string; lastName?: string }) {
    await OfficersService.getById(id, universityId)
    return OfficersRepository.update(id, data)
  }

  static async assign(stageId: string, universityId: string, officerId: string, facultyId?: string, departmentId?: string, sessionId?: string) {
    return OfficersRepository.assign(universityId, stageId, officerId, facultyId, departmentId, sessionId)
  }

  static async assignMultiple(stageIds: string[], universityId: string, officerId: string, facultyId?: string, departmentId?: string, sessionId?: string) {
    return OfficersRepository.assignMultiple(universityId, stageIds, officerId, facultyId, departmentId, sessionId)
  }

  static async unassign(assignmentId: string) {
    return OfficersRepository.unassign(assignmentId)
  }

  static async delete(id: string, universityId: string) {
    await OfficersService.getById(id, universityId)
    return OfficersRepository.delete(id)
  }
}
