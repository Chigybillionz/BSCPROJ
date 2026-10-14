import { db } from '@/lib/db'

export class StagesRepository {
  static async findAll(universityId: string, campaignId?: string) {
    return db.clearanceStage.findMany({
      where: campaignId ? { universityId, campaignId } : { universityId },
      include: {
        officerAssignments: { include: { officer: true, faculty: true, department: true, session: true } },
        documentRequirements: { include: { documentType: true, faculty: true, department: true, session: true } },
      },
      orderBy: { orderIndex: 'asc' },
    })
  }

  static async findById(id: string, universityId: string) {
    return db.clearanceStage.findFirst({
      where: { id, universityId },
      include: {
        officerAssignments: { include: { officer: true, faculty: true, department: true, session: true } },
        documentRequirements: { include: { documentType: true, faculty: true, department: true, session: true } },
      },
    })
  }

  static async findFirst(campaignId: string) {
    return db.clearanceStage.findFirst({
      where: { campaignId, isActive: true },
      orderBy: { orderIndex: 'asc' },
    })
  }

  static async findNext(campaignId: string, currentOrderIndex: number) {
    return db.clearanceStage.findFirst({
      where: { campaignId, isActive: true, orderIndex: { gt: currentOrderIndex } },
      orderBy: { orderIndex: 'asc' },
    })
  }

  static async create(data: { universityId: string; campaignId: string; name: string; description?: string; orderIndex: number; scope?: 'UNIVERSITY' | 'FACULTY' | 'DEPARTMENT' }) {
    return db.clearanceStage.create({ data })
  }

  static async update(id: string, data: { name?: string; description?: string; scope?: 'UNIVERSITY' | 'FACULTY' | 'DEPARTMENT'; orderIndex?: number; isActive?: boolean }) {
    return db.clearanceStage.update({ where: { id }, data })
  }

  static async reorder(stages: { id: string; orderIndex: number }[]) {
    return db.$transaction(stages.map(s => db.clearanceStage.update({ where: { id: s.id }, data: { orderIndex: s.orderIndex } })))
  }

  static async toggle(id: string, isActive: boolean) {
    return db.clearanceStage.update({ where: { id }, data: { isActive } })
  }

  static async delete(id: string) {
    return db.clearanceStage.delete({ where: { id } })
  }

  static async count(universityId: string, campaignId?: string) {
    return db.clearanceStage.count({ where: campaignId ? { universityId, campaignId } : { universityId } })
  }
}
