import { db } from '@/lib/db'
import { CreateStudentDto, UpdateStudentDto } from './students.types'

export class StudentsRepository {
  static async findAll(universityId: string, opts: { page: number; limit: number; search?: string; facultyId?: string; departmentId?: string }) {
    const { page, limit, search, facultyId, departmentId } = opts
    const skip = (page - 1) * limit
    const where: any = { universityId }
    if (facultyId)    where.facultyId    = facultyId
    if (departmentId) where.departmentId = departmentId
    if (search) {
      const trimmed = search.trim()
      const parts = trimmed.split(/\s+/).filter(Boolean)
      const orConditions: any[] = [
        { firstName: { contains: trimmed, mode: 'insensitive' } },
        { lastName:  { contains: trimmed, mode: 'insensitive' } },
        { matricNo:  { contains: trimmed, mode: 'insensitive' } },
        { jambRegNo: { contains: trimmed, mode: 'insensitive' } },
      ]

      if (parts.length >= 2) {
        orConditions.push(
          {
            AND: [
              { firstName: { contains: parts[0], mode: 'insensitive' } },
              { lastName:  { contains: parts.slice(1).join(' '), mode: 'insensitive' } },
            ]
          },
          {
            AND: [
              { firstName: { contains: parts.slice(1).join(' '), mode: 'insensitive' } },
              { lastName:  { contains: parts[0], mode: 'insensitive' } },
            ]
          }
        )
      }

      where.OR = orConditions
    }

    const [data, total] = await Promise.all([
      db.student.findMany({ where, skip, take: limit, include: { faculty: true, department: true }, orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }] }),
      db.student.count({ where }),
    ])
    return { data, total }
  }

  static async findById(id: string, universityId: string) {
    return db.student.findFirst({ where: { id, universityId }, include: { faculty: true, department: true, user: { select: { email: true } } } })
  }

  static async findByUserId(userId: string, universityId: string) {
    return db.student.findFirst({ where: { userId, universityId } })
  }

  static async findByMatricNo(matricNo: string, universityId: string) {
    return db.student.findUnique({ where: { universityId_matricNo: { universityId, matricNo } } })
  }

  static async findByJambRegNo(jambRegNo: string, universityId: string) {
    return db.student.findUnique({ where: { universityId_jambRegNo: { universityId, jambRegNo } } })
  }

  static async create(universityId: string, userId: string | null, data: CreateStudentDto) {
    return db.student.create({ data: { universityId, userId, ...data } })
  }

  static async update(id: string, universityId: string, data: UpdateStudentDto) {
    return db.student.update({ where: { id }, data })
  }

  static async delete(id: string, universityId: string) {
    return db.student.delete({ where: { id } })
  }

  static async count(universityId: string) {
    return db.student.count({ where: { universityId } })
  }
}
