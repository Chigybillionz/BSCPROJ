import { db } from '@/lib/db'

export class OfficersRepository {
  static async findAll(universityId: string, opts: { page: number; limit: number }) {
    const { page, limit } = opts
    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      db.officer.findMany({
        where: { universityId }, skip, take: limit,
        include: { user: { select: { id: true, email: true, role: true, isActive: true, createdAt: true } }, stageAssignments: { include: { stage: true, faculty: true, department: true, session: true } } },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      db.officer.count({ where: { universityId } }),
    ])
    return { data, total }
  }

  static async findById(id: string, universityId: string) {
    return db.officer.findFirst({
      where: { id, universityId },
      include: { user: { select: { id: true, email: true, role: true, isActive: true, createdAt: true } }, stageAssignments: { include: { stage: true, faculty: true, department: true, session: true } } },
    })
  }

  static async findByUserId(userId: string) {
    return db.officer.findUnique({
      where: { userId },
      include: { stageAssignments: { include: { stage: true, faculty: true, department: true, session: true } } },
    })
  }

  static async create(universityId: string, userId: string, data: { firstName: string; lastName: string }) {
    return db.officer.create({ data: { universityId, userId, ...data } })
  }

  static async update(id: string, data: { firstName?: string; lastName?: string }) {
    return db.officer.update({ where: { id }, data })
  }

  static async delete(id: string) {
    return db.officer.delete({ where: { id } })
  }

  static async count(universityId: string) {
    return db.officer.count({ where: { universityId } })
  }

  static async assign(universityId: string, stageId: string, officerId: string, facultyId?: string, departmentId?: string, sessionId?: string) {
    return db.stageOfficerAssignment.create({
      data: { universityId, stageId, officerId, facultyId, departmentId, sessionId },
    })
  }

  static async unassign(id: string) {
    return db.stageOfficerAssignment.deleteMany({ where: { id } })
  }
}
