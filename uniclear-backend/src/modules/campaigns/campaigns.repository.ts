import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export class CampaignsRepository {
  static async findAll(universityId: string, sessionId?: string) {
    const where: any = { universityId }
    if (sessionId) {
      where.OR = [
        { sessionId },
        { clearanceRequests: { some: { sessionId } } },
        { isActive: true },
      ]
    }
    return db.clearanceCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        eligibilityRules: true,
        stages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            officerAssignments: { include: { officer: { include: { user: true } } } },
            documentRequirements: { include: { documentType: true } }
          }
        }
      }
    } as any)
  }

  static async findActive(universityId: string, filter?: { facultyId?: string, departmentId?: string, level?: string, identifiers?: string[] }) {
    const baseWhere: any = { universityId, isActive: true }

    if (filter) {
      baseWhere.AND = [
        {
          OR: [
            // If no rules exist, everyone is eligible
            { eligibilityRules: { none: {} } },
            // Otherwise, student must match at least one rule
            {
              eligibilityRules: {
                some: {
                  AND: [
                    { OR: [{ facultyId: null }, { facultyId: filter.facultyId }] },
                    { OR: [{ departmentId: null }, { departmentId: filter.departmentId }] },
                    { OR: [{ level: null }, { level: filter.level }] }
                  ]
                }
              }
            }
          ]
        },
        {
          OR: [
            { whitelistEnabled: false },
            { whitelistEnabled: true, whitelist: { hasSome: filter.identifiers || [] } }
          ]
        }
      ]
    }

    return db.clearanceCampaign.findMany({
      where: baseWhere as any,
      orderBy: { createdAt: 'desc' }
    } as any)
  }

  static async findById(id: string, universityId: string) {
    return db.clearanceCampaign.findFirst({
      where: { id, universityId },
      include: {
        eligibilityRules: true,
        stages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            officerAssignments: { include: { officer: { include: { user: true } } } },
            documentRequirements: { include: { documentType: true } }
          }
        }
      }
    } as any)
  }

  static async create(data: any) {
    return db.clearanceCampaign.create({ data })
  }

  static async update(id: string, data: any) {
    return db.clearanceCampaign.update({ where: { id }, data })
  }

  static async delete(id: string) {
    return db.clearanceCampaign.delete({ where: { id } })
  }

  static async toggle(id: string, isActive: boolean) {
    return db.clearanceCampaign.update({ where: { id }, data: { isActive } })
  }
}
