import { db } from '@/lib/db'
import { ClearanceStatus, StageStatus } from '@prisma/client'

export class ClearanceRepository {
  static async findActive(studentId: string, universityId: string, sessionId: string, campaignId: string) {
    return db.clearanceRequest.findFirst({
      where: { studentId, universityId, sessionId, campaignId, status: { not: 'COMPLETED' } },
    })
  }

  static async findById(id: string, universityId: string) {
    return db.clearanceRequest.findFirst({
      where: { id, universityId },
      include: {
        campaign: true,
        student: true,
        session: true,
        stageApprovals: { include: { stage: true }, orderBy: { decidedAt: 'desc' } },
        documents: { include: { documentType: true } },
        currentStage: {
          include: {
            documentRequirements: {
              include: { documentType: true }
            }
          }
        }
      },
    })
  }

  static async findForCertificate(id: string, universityId: string) {
    return db.clearanceRequest.findFirst({
      where: { id, universityId },
      include: {
        university: {
          include: {
            branding: true,
          },
        },
        campaign: {
          include: {
            stages: {
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        session: true,
        student: {
          include: {
            faculty: true,
            department: true,
            user: true,
          },
        },
        documents: {
          include: {
            documentType: true,
          },
        },
        stageApprovals: {
          include: {
            stage: true,
            stamp: true,
            officerRef: true,
            officer: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { decidedAt: 'asc' },
        },
      },
    })
  }

  static async findByStudent(studentId: string, universityId: string) {
    return db.clearanceRequest.findMany({
      where: { studentId, universityId },
      include: {
        campaign: true,
        session: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jambRegNo: true,
            matricNo: true,
            level: true,
            faculty: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        stageApprovals: { include: { stage: true, stamp: true }, orderBy: { decidedAt: 'asc' } },
        documents: { include: { documentType: true } },
        currentStage: {
          include: {
            documentRequirements: {
              include: { documentType: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  static async create(data: { studentId: string; universityId: string; campaignId: string; sessionId: string; currentStageId: string }) {
    return db.clearanceRequest.create({ data })
  }

  static async updateStage(id: string, currentStageId: string | null, status: ClearanceStatus, client: any = db) {
    return client.clearanceRequest.update({ 
      where: { id }, 
      data: { currentStageId, status, stageStatus: 'PENDING', completedAt: status === 'COMPLETED' ? new Date() : undefined } 
    })
  }

  static async updateStageStatus(id: string, stageStatus: StageStatus) {
    return db.clearanceRequest.update({ where: { id }, data: { stageStatus } })
  }

  static async findOfficerQueue(universityId: string, assignments: any[], opts: { page: number; limit: number; search?: string; sessionId?: string; campaignId?: string; stageStatus?: string }) {
    const { page, limit, search, sessionId, campaignId, stageStatus } = opts
    const skip = (page - 1) * limit

    const assignmentOrs = assignments.map(a => {
      const cond: any = { currentStageId: a.stageId }
      if (a.facultyId || a.departmentId) {
        cond.student = {}
        if (a.facultyId) cond.student.facultyId = a.facultyId
        if (a.departmentId) cond.student.departmentId = a.departmentId
      }
      return cond
    })

    const where: any = {
      universityId,
      status: 'IN_PROGRESS',
      AND: [
        { OR: assignmentOrs }
      ]
    }

    if (!stageStatus || stageStatus === 'SUBMITTED') {
      where.stageStatus = 'SUBMITTED'
    } else if (stageStatus !== 'ALL') {
      where.stageStatus = stageStatus as StageStatus
    }

    if (sessionId) where.sessionId = sessionId
    if (campaignId) where.campaignId = campaignId

    if (search) {
      where.AND.push({
        student: {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName:  { contains: search, mode: 'insensitive' } },
            { jambRegNo: { contains: search, mode: 'insensitive' } },
          ]
        }
      })
    }

    const [data, total] = await Promise.all([
      db.clearanceRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { include: { faculty: true, department: true } },
          currentStage: true,
          campaign: true,
          session: true,
          documents: { include: { documentType: true } },
        },
        orderBy: { updatedAt: 'asc' },
      }),
      db.clearanceRequest.count({ where }),
    ])
    return { data, total }
  }

  static async createStageApproval(data: { universityId: string; requestId: string; stageId: string; officerId: string; stampId?: string; status: StageStatus; remarks?: string; attachmentUrl?: string; attachmentKey?: string; ipAddress?: string }, client: any = db) {
    return client.stageApproval.create({ data })
  }

  static async getHistory(requestId: string, universityId: string) {
    return db.stageApproval.findMany({
      where: { requestId, universityId },
      include: { stage: true, officer: { select: { id: true, email: true } }, stamp: true },
      orderBy: { decidedAt: 'asc' },
    })
  }
}
// force restart
