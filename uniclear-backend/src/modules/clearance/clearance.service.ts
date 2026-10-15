import crypto from 'crypto'
import { ClearanceRepository } from './clearance.repository'
import { CertificateGenerator } from './certificate.generator'
import { StagesRepository } from '@/modules/stages/stages.repository'
import { DocumentTypesRepository } from '@/modules/document-types/document-types.repository'
import { DocumentsRepository } from '@/modules/documents/document.repository'
import { OfficersRepository } from '@/modules/officers/officers.repository'
import { StudentsRepository } from '@/modules/students/students.repository'
import { eventBus } from '@/core/events/EventBus'
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '@/core/errors/AppError'
import { db } from '@/lib/db'

export class ClearanceService {
  static async start(userId: string, universityId: string, sessionId: string, campaignId: string) {
    const student = await StudentsRepository.findByUserId(userId, universityId)
    if (!student) throw new NotFoundError('Student profile not found')

    const existing = await ClearanceRepository.findActive(student.id, universityId, sessionId, campaignId)
    if (existing) throw new ConflictError('Clearance already in progress for this campaign')

    const campaign = await db.clearanceCampaign.findFirst({
      where: { id: campaignId, universityId },
      include: { eligibilityRules: true }
    })
    if (!campaign) throw new NotFoundError('Campaign not found')
    if (!campaign.isActive) throw new ValidationError('This clearance campaign is closed or inactive')

    // Whitelist check
    if (campaign.whitelistEnabled) {
      const isWhitelisted = campaign.whitelist.includes(student.jambRegNo) || (student.matricNo && campaign.whitelist.includes(student.matricNo))
      if (!isWhitelisted) {
        throw new ForbiddenError('You are not eligible for this clearance campaign (whitelist required)')
      }
    }

    // Eligibility rules check
    if (campaign.eligibilityRules && campaign.eligibilityRules.length > 0) {
      const matchesRule = campaign.eligibilityRules.some(rule => {
        if (rule.facultyId && rule.facultyId !== student.facultyId) return false
        if (rule.departmentId && rule.departmentId !== student.departmentId) return false
        if (rule.level && rule.level !== student.level) return false
        return true
      })
      if (!matchesRule) {
        throw new ForbiddenError('You do not meet the faculty/department/level criteria for this campaign')
      }
    }

    const firstStage = await StagesRepository.findFirst(campaignId)
    if (!firstStage) throw new NotFoundError('No clearance stages configured for this campaign')

    const session = await db.academicSession.findFirst({ where: { id: sessionId, universityId } })
    if (!session) throw new NotFoundError('Academic session not found')

    const clearance = await ClearanceRepository.create({ studentId: student.id, universityId, campaignId, sessionId, currentStageId: firstStage.id })
    await ClearanceRepository.updateStage(clearance.id, firstStage.id, 'IN_PROGRESS')

    eventBus.emit('clearance.started', { clearanceId: clearance.id, studentId: student.id, universityId })
    return clearance
  }

  static async getByStudentId(studentId: string, universityId: string) {
    const clearances = await ClearanceRepository.findByStudent(studentId, universityId)
    return clearances
  }

  static async getById(id: string, universityId: string) {
    const clearance = await ClearanceRepository.findById(id, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    return clearance
  }

  static async getStatus(userId: string, universityId: string) {
    const student = await StudentsRepository.findByUserId(userId, universityId)
    if (!student) throw new NotFoundError('Student profile not found')
    return ClearanceRepository.findByStudent(student.id, universityId)
  }

  static async submit(requestId: string, userId: string, universityId: string) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (clearance.student.userId !== userId) throw new ForbiddenError()
    if (!clearance.currentStageId) throw new ValidationError('No active stage to submit')

    // Ensure all required docs for this stage are uploaded
    const student      = await db.student.findUnique({ where: { id: clearance.studentId } })
    const requirements = await DocumentTypesRepository.findByStage(clearance.currentStageId, universityId, {
      facultyId:    student?.facultyId    ?? undefined,
      departmentId: student?.departmentId ?? undefined,
      sessionId:    clearance.sessionId,
      level:        student?.level        ?? undefined,
    })
    const required = requirements.filter(r => r.isRequired)
    const uploaded = await DocumentsRepository.findByStage(requestId, clearance.currentStageId, universityId)
    const uploadedTypeIds = uploaded.map(d => d.documentTypeId)
    const missing = required.filter(r => !uploadedTypeIds.includes(r.documentTypeId))

    if (missing.length > 0) {
      throw new ValidationError(`Missing required documents: ${missing.map(m => m.documentType.name).join(', ')}`)
    }

    await ClearanceRepository.updateStageStatus(requestId, 'SUBMITTED')

    eventBus.emit('stage.submitted', { requestId, stageId: clearance.currentStageId, studentId: clearance.studentId, universityId })
    return clearance
  }

  static async approve(requestId: string, officerUserId: string, universityId: string, remarks?: string, attachmentUrl?: string, attachmentKey?: string, ipAddress?: string, issuedData?: any, stampId?: string) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (!clearance.currentStageId) throw new ValidationError('No active stage')

    if (clearance.stageStatus !== 'SUBMITTED') {
      throw new ValidationError('Cannot approve stage: student has not submitted required documents')
    }

    const officer = await OfficersRepository.findByUserId(officerUserId)
    if (!officer) throw new ForbiddenError('Officer profile not found')

    const matchingAssignments = officer.stageAssignments.filter(a => a.stageId === clearance.currentStageId)
    if (matchingAssignments.length === 0) {
      throw new ForbiddenError('You are not assigned to this stage')
    }

    // Verify scope: if assignment is scoped to faculty or dept, student must match
    const authorized = matchingAssignments.some(a => {
      if (a.facultyId && a.facultyId !== clearance.student.facultyId) return false
      if (a.departmentId && a.departmentId !== clearance.student.departmentId) return false
      return true
    })
    if (!authorized) {
      throw new ForbiddenError('You are not authorized to review students outside your assigned faculty/department')
    }

    const currentStage = await db.clearanceStage.findUnique({ where: { id: clearance.currentStageId } })
    const nextStage = await StagesRepository.findNext(clearance.campaignId, currentStage!.orderIndex)

    if (!nextStage) {
      // Validate issuedData
      const requiredFields = (clearance.campaign as any)?.issuedDataFields || []
      const providedFields = issuedData ? Object.keys(issuedData) : []
      const missing = requiredFields.filter((f: string) => !providedFields.includes(f) || !issuedData[f])
      if (missing.length > 0) {
        throw new ValidationError(`Missing required issued data fields: ${missing.join(', ')}`)
      }
    }

    const stageIdToApprove = clearance.currentStageId
    const studentId = clearance.studentId
    const clearanceId = clearance.id

    // Use transaction with concurrency check
    await db.$transaction(async (tx) => {
      const currentReq = await tx.clearanceRequest.findUnique({
        where: { id: clearanceId },
        select: { currentStageId: true, stageStatus: true }
      })
      if (!currentReq || currentReq.currentStageId !== stageIdToApprove || currentReq.stageStatus !== 'SUBMITTED') {
        throw new ConflictError('This clearance stage has already been reviewed or modified')
      }

      await ClearanceRepository.createStageApproval({
        universityId,
        requestId,
        stageId: stageIdToApprove,
        officerId: officerUserId,
        stampId,
        status: 'APPROVED',
        remarks,
        attachmentUrl,
        attachmentKey,
        ipAddress,
      }, tx)

      if (nextStage) {
        await ClearanceRepository.updateStage(requestId, nextStage.id, 'IN_PROGRESS', tx)
      } else {
        const clearanceNumber = `CLR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
        await tx.clearanceRequest.update({
          where: { id: clearanceId },
          data: {
            status: 'COMPLETED',
            currentStageId: null,
            stageStatus: 'PENDING',
            completedAt: new Date(),
            clearanceNumber,
            issuedData
          }
        })
      }
    })

    if (!nextStage) {
      eventBus.emit('clearance.complete', { requestId, studentId, universityId })
    }
    eventBus.emit('stage.approved', { requestId, stageId: stageIdToApprove, officerId: officerUserId, universityId, studentId })

    return ClearanceRepository.findById(requestId, universityId)
  }

  static async reject(requestId: string, officerUserId: string, universityId: string, remarks: string, ipAddress?: string) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (!clearance.currentStageId) throw new ValidationError('No active stage')

    const officer = await OfficersRepository.findByUserId(officerUserId)
    if (!officer) throw new ForbiddenError('Officer profile not found')

    const matchingAssignments = officer.stageAssignments.filter(a => a.stageId === clearance.currentStageId)
    if (matchingAssignments.length === 0) {
      throw new ForbiddenError('You are not assigned to this stage')
    }

    const authorized = matchingAssignments.some(a => {
      if (a.facultyId && a.facultyId !== clearance.student.facultyId) return false
      if (a.departmentId && a.departmentId !== clearance.student.departmentId) return false
      return true
    })
    if (!authorized) {
      throw new ForbiddenError('You are not authorized to review students outside your assigned faculty/department')
    }

    await ClearanceRepository.createStageApproval({
      universityId, requestId, stageId: clearance.currentStageId,
      officerId: officerUserId, status: 'REJECTED', remarks, ipAddress,
    })

    await ClearanceRepository.updateStageStatus(requestId, 'REJECTED')

    eventBus.emit('stage.rejected', { requestId, stageId: clearance.currentStageId, officerId: officerUserId, remarks, universityId, studentId: clearance.studentId })
    return clearance
  }

  static async getQueue(officerUserId: string, universityId: string, opts: { page: number; limit: number; search?: string; sessionId?: string; campaignId?: string; stageStatus?: string }) {
    const officer = await OfficersRepository.findByUserId(officerUserId)
    if (!officer?.stageAssignments?.length) throw new ForbiddenError('You are not assigned to any stage')

    let assignments = officer.stageAssignments
    if (opts.campaignId) {
      assignments = assignments.filter(a => (a as any).stage.campaignId === opts.campaignId)
    }

    if (assignments.length === 0) return { data: [], total: 0 }

    return ClearanceRepository.findOfficerQueue(universityId, assignments, opts)
  }

  static async getHistory(requestId: string, universityId: string, userId?: string, role?: string) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (role === 'STUDENT' && clearance.student.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this clearance history')
    }
    return ClearanceRepository.getHistory(requestId, universityId)
  }

  static async getCertificate(requestId: string, universityId: string, userId?: string, role?: string) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (clearance.status !== 'COMPLETED') throw new ValidationError('Clearance not yet completed')
    if (role === 'STUDENT' && clearance.student.userId !== userId) {
      throw new ForbiddenError('You do not have permission to download this certificate')
    }
    return clearance
  }

  static async verify(clearanceNumber: string) {
    if (!clearanceNumber || typeof clearanceNumber !== 'string' || !clearanceNumber.trim()) {
      throw new ValidationError('Clearance number is required')
    }

    const clearance = await db.clearanceRequest.findUnique({
      where: { clearanceNumber: clearanceNumber.trim() },
      include: {
        student: {
          include: {
            faculty: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        session: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true, issuesCertificate: true, issuesClearanceSlip: true } },
        university: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
        stageApprovals: {
          where: { status: 'APPROVED' },
          include: {
            stage: { select: { id: true, name: true, orderIndex: true } },
          },
          orderBy: { decidedAt: 'asc' },
        },
      },
    })

    if (!clearance || clearance.status !== 'COMPLETED') {
      throw new NotFoundError('No valid completed clearance record found for this clearance number')
    }

    const maskString = (val?: string | null) => {
      if (!val) return 'N/A'
      if (val.length <= 4) return val
      return `${val.substring(0, 3)}***${val.substring(val.length - 2)}`
    }

    return {
      isValid: true,
      clearanceNumber: clearance.clearanceNumber,
      status: clearance.status,
      completedAt: clearance.completedAt,
      student: {
        firstName: clearance.student.firstName,
        lastName: clearance.student.lastName,
        fullName: `${clearance.student.firstName} ${clearance.student.lastName}`.trim(),
        jambRegNo: clearance.student.jambRegNo,
        matricNo: clearance.student.matricNo,
        maskedJambRegNo: maskString(clearance.student.jambRegNo),
        maskedMatricNo: maskString(clearance.student.matricNo),
        faculty: clearance.student.faculty?.name || 'N/A',
        department: clearance.student.department?.name || 'N/A',
      },
      university: {
        id: clearance.university.id,
        name: clearance.university.name,
        slug: clearance.university.slug,
        logoUrl: clearance.university.logoUrl,
        primaryColor: clearance.university.primaryColor,
      },
      session: clearance.session.name,
      campaign: clearance.campaign.name,
      stages: clearance.stageApprovals.map(approval => ({
        stageName: approval.stage.name,
        approvedAt: approval.decidedAt,
      })),
      issuedData: clearance.issuedData,
    }
  }
}

