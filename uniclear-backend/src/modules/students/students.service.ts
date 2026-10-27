import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { StudentsRepository } from './students.repository'
import { CreateStudentDto, UpdateStudentDto } from './students.types'
import { ConflictError, NotFoundError, TierLimitError } from '@/core/errors/AppError'
import { TIER_LIMITS } from '@/lib/constants/tiers'
import { AuthRepository } from '@/modules/auth/auth.repository'
import { logger } from '@/core/logger/logger'
import { sendInviteEmail } from '@/modules/notifications/channels/email.channel'
import { env } from '@/core/config/env'
import { AuditService } from '@/modules/audit/audit.service'

export class StudentsService {
  static async list(universityId: string, opts: { page: number; limit: number; search?: string; facultyId?: string; departmentId?: string }) {
    return StudentsRepository.findAll(universityId, opts)
  }

  static async getById(id: string, universityId: string) {
    const student = await StudentsRepository.findById(id, universityId)
    if (!student) throw new NotFoundError('Student not found')
    return student
  }

  static async create(universityId: string, data: CreateStudentDto) {
    // Check tier limit
    const contract = await db.contractPlan.findUnique({ where: { universityId } })
    const tier = contract?.tier ?? 'TRIAL'
    const limit = TIER_LIMITS[tier].maxStudents
    const count = await StudentsRepository.count(universityId)
    if (count >= limit) throw new TierLimitError(`Student limit (${limit}) reached for your plan`)

    const existing = await StudentsRepository.findByJambRegNo(data.jambRegNo, universityId)
    if (existing) throw new ConflictError('JAMB reg number already exists')

    if (!data.email) {
      // Unclaimed admission record (Whitelist)
      const student = await StudentsRepository.create(universityId, null, data)
      return { ...student, inviteLink: null, tempPassword: null }
    }

    const existingUser = await db.user.findUnique({ where: { email: data.email } })
    if (existingUser) throw new ConflictError('Email already in use')

    const tempPassword = crypto.randomBytes(4).toString('hex')
    const tempHash = await bcrypt.hash(tempPassword, 12)
    const user = await db.user.create({
      data: { email: data.email, passwordHash: tempHash, role: 'STUDENT', universityId },
    })

    const token = crypto.randomBytes(32).toString('hex')
    await AuthRepository.saveInviteToken(user.id, token, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

    const inviteLink = `${env.APP_URL}/set-password?token=${token}`

    await sendInviteEmail({
      to: data.email,
      name: `${data.firstName} ${data.lastName}`,
      role: 'Student',
      inviteLink,
      tempPassword,
    })

    logger.info({ email: data.email, inviteLink }, 'Student invite created')
    const { email, ...studentData } = data
    const student = await StudentsRepository.create(universityId, user.id, studentData)
    return { ...student, inviteLink, tempPassword, email }
  }

  static async bulkCreate(universityId: string, students: any[]) {
    const contract = await db.contractPlan.findUnique({ where: { universityId } })
    const tier = contract?.tier ?? 'TRIAL'
    const limit = TIER_LIMITS[tier].maxStudents
    const count = await StudentsRepository.count(universityId)
    if (count + students.length > limit) throw new TierLimitError(`Bulk import exceeds student limit (${limit}) for your plan`)

    const results = []
    const errors = []

    for (const raw of students) {
      try {
        const data: CreateStudentDto = {
          email: raw.email,
          jambRegNo: raw.jambRegNo,
          firstName: raw.firstName,
          lastName: raw.lastName,
          level: raw.level,
        }

        // Map Session
        if (raw.sessionName) {
          const sessionName = raw.sessionName.trim()
          let session = await db.academicSession.findFirst({ 
            where: { universityId, name: { equals: sessionName, mode: 'insensitive' } } 
          })
          if (!session) {
            throw new Error(`Session '${sessionName}' not found. Please create it first.`)
          }
          data.entrySessionId = session.id
        }

        // Map Faculty
        if (raw.facultyName) {
          const facultyName = raw.facultyName.trim()
          let faculty = await db.faculty.findFirst({ 
            where: { universityId, name: { equals: facultyName, mode: 'insensitive' } } 
          })
          if (!faculty) {
            throw new Error(`Faculty '${facultyName}' not found. Please create it first.`)
          }
          data.facultyId = faculty.id
        }

        // Map Department
        if (raw.departmentName && data.facultyId) {
          const departmentName = raw.departmentName.trim()
          let dept = await db.department.findFirst({ 
            where: { facultyId: data.facultyId, name: { equals: departmentName, mode: 'insensitive' } } 
          })
          if (!dept) {
            throw new Error(`Department '${departmentName}' not found in this faculty. Please create it first.`)
          }
          data.departmentId = dept.id
        }

        // Check if student exists by JAMB Reg No, if so, we can just update them instead of throwing a conflict!
        const existing = await db.student.findFirst({ where: { jambRegNo: raw.jambRegNo, universityId } })
        if (existing) {
          // Update existing student with new data (like matricNo)
          const updateData: any = {}
          if (raw.matricNo) updateData.matricNo = raw.matricNo
          if (data.facultyId) updateData.facultyId = data.facultyId
          if (data.departmentId) updateData.departmentId = data.departmentId
          
          if (Object.keys(updateData).length > 0) {
            await db.student.update({ where: { id: existing.id }, data: updateData })
          }
          results.push({ ...existing, ...updateData })
        } else {
          // Create new student
          const student = await this.create(universityId, { ...data, matricNo: raw.matricNo } as any)
          results.push(student)
        }
      } catch (err: any) {
        errors.push({ jambRegNo: raw.jambRegNo, error: err.message })
      }
    }
    return { created: results.length, errors }
  }

  static async update(id: string, universityId: string, actorId: string, data: UpdateStudentDto) {
    const oldStudent = await StudentsService.getById(id, universityId)
    const updated = await StudentsRepository.update(id, universityId, data)
    
    const changes: any = {}
    if (data.matricNo && oldStudent.matricNo !== data.matricNo) changes.matricNo = { old: oldStudent.matricNo, new: data.matricNo }
    if (data.jambRegNo && oldStudent.jambRegNo !== data.jambRegNo) changes.jambRegNo = { old: oldStudent.jambRegNo, new: data.jambRegNo }
    if (data.firstName && oldStudent.firstName !== data.firstName) changes.firstName = { old: oldStudent.firstName, new: data.firstName }
    if (data.lastName && oldStudent.lastName !== data.lastName) changes.lastName = { old: oldStudent.lastName, new: data.lastName }
    
    if (Object.keys(changes).length > 0) {
      await AuditService.log({
        universityId,
        actorId,
        action: 'UPDATE_STUDENT_PROFILE',
        targetId: id,
        targetType: 'STUDENT',
        metadata: { changes }
      })
    }
    
    return updated
  }

  static async delete(id: string, universityId: string) {
    await StudentsService.getById(id, universityId)
    return StudentsRepository.delete(id, universityId)
  }

  static async getClearanceProgress(id: string, universityId: string) {
    const student = await StudentsService.getById(id, universityId)
    return db.clearanceRequest.findFirst({
      where: { studentId: student.id, universityId },
      include: {
        stageApprovals: {
          include: {
            stage: true,
            officerRef: true,
            stamp: true,
          },
          orderBy: { decidedAt: 'asc' },
        },
        documents: {
          include: {
            documentType: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
        session: true,
        campaign: {
          include: {
            stages: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
