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

  static async submit(requestId: string, userId: string, universityId: string, stageId?: string) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (clearance.student.userId !== userId) throw new ForbiddenError()

    const targetStageId = stageId || clearance.currentStageId
    if (!targetStageId) throw new ValidationError('No active stage to submit')

    const targetStage = await db.clearanceStage.findFirst({
      where: { id: targetStageId, campaignId: clearance.campaignId, isActive: true },
    })
    if (!targetStage) throw new NotFoundError('Clearance stage not found in this campaign')

    const isAlreadyApproved = (clearance.stageApprovals || []).some(
      a => a.stageId === targetStageId && a.status === 'APPROVED'
    )
    if (isAlreadyApproved) throw new ValidationError('This stage has already been approved')

    // Ensure all required docs for this stage are uploaded
    const student = await db.student.findUnique({ where: { id: clearance.studentId } })
    const requirements = await DocumentTypesRepository.findByStage(targetStageId, universityId, {
      facultyId:    student?.facultyId    ?? undefined,
      departmentId: student?.departmentId ?? undefined,
      sessionId:    clearance.sessionId,
      level:        student?.level        ?? undefined,
    })
    const required = requirements.filter(r => r.isRequired)
    const allUploaded = await DocumentsRepository.findByRequest(requestId, universityId)
    const validUploaded = allUploaded.filter(d => d.status !== 'REJECTED')
    const uploadedTypeIds = validUploaded.map(d => d.documentTypeId)
    const missing = required.filter(r => !uploadedTypeIds.includes(r.documentTypeId))

    if (missing.length > 0) {
      throw new ValidationError(`Missing required documents for ${targetStage.name}: ${missing.map(m => m.documentType.name).join(', ')}`)
    }

    // Only update stageStatus to SUBMITTED when submitting the current active stage.
    // For advance-uploaded future stages, just touch updatedAt — the status advances
    // naturally when the officer approves the current stage and currentStageId moves forward.
    if (clearance.currentStageId === targetStageId) {
      await ClearanceRepository.updateStageStatus(requestId, 'SUBMITTED')
    } else {
      // Prevent re-submitting a future stage that is already submitted
      const isAlreadySubmitted = (clearance.stageApprovals || []).some(
        a => a.stageId === targetStageId && a.status === 'SUBMITTED'
      )
      if (!isAlreadySubmitted) {
        await db.clearanceRequest.update({
          where: { id: requestId },
          data: { updatedAt: new Date() },
        })
      }
    }

    eventBus.emit('stage.submitted', { requestId, stageId: targetStageId, studentId: clearance.studentId, universityId })
    return clearance
  }

  static async approve(
    requestId: string,
    officerUserId: string,
    universityId: string,
    remarks?: string,
    attachmentUrl?: string,
    attachmentKey?: string,
    ipAddress?: string,
    issuedData?: any,
    stampId?: string,
    stageId?: string
  ) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (clearance.status === 'COMPLETED') throw new ConflictError('This clearance is already completed')

    const officer = await OfficersRepository.findByUserId(officerUserId)
    if (!officer) throw new ForbiddenError('Officer profile not found')

    const campaignStages = await db.clearanceStage.findMany({
      where: { campaignId: clearance.campaignId, isActive: true },
      orderBy: { orderIndex: 'asc' },
    })
    if (campaignStages.length === 0) throw new NotFoundError('No active stages configured for this campaign')
    const campaignStageIds = campaignStages.map(s => s.id)

    const alreadyApprovedStageIds = (clearance.stageApprovals || [])
      .filter(a => a.status === 'APPROVED')
      .map(a => a.stageId)

    let stageIdToApprove = stageId
    if (!stageIdToApprove) {
      const candidateAssignment = officer.stageAssignments.find(a =>
        campaignStageIds.includes(a.stageId) && !alreadyApprovedStageIds.includes(a.stageId)
      )
      stageIdToApprove = candidateAssignment?.stageId || clearance.currentStageId || campaignStageIds[0]
    }

    const matchingAssignments = officer.stageAssignments.filter(a => a.stageId === stageIdToApprove)
    if (matchingAssignments.length === 0) {
      throw new ForbiddenError('You are not assigned to this stage')
    }

    // Verify scope: if assignment is scoped to faculty, dept, or session, student must match
    const authorized = matchingAssignments.some(a => {
      if (a.facultyId && a.facultyId !== clearance.student.facultyId) return false
      if (a.departmentId && a.departmentId !== clearance.student.departmentId) return false
      if (a.sessionId && a.sessionId !== clearance.sessionId) return false
      return true
    })
    if (!authorized) {
      throw new ForbiddenError('You are not authorized to review students outside your assigned faculty/department/session')
    }

    if (alreadyApprovedStageIds.includes(stageIdToApprove)) {
      throw new ConflictError('This clearance stage has already been approved')
    }

    // Validate required documents for this stage
    const student = await db.student.findUnique({ where: { id: clearance.studentId } })
    const requirements = await DocumentTypesRepository.findByStage(stageIdToApprove, universityId, {
      facultyId:    student?.facultyId    ?? undefined,
      departmentId: student?.departmentId ?? undefined,
      sessionId:    clearance.sessionId,
      level:        student?.level        ?? undefined,
    })
    const required = requirements.filter(r => r.isRequired)
    if (required.length > 0) {
      // Fetch ALL documents for this request (not just stage-filtered) so that
      // documents uploaded before stage routing are still found
      const allUploaded = await DocumentsRepository.findByRequest(requestId, universityId)
      const validUploaded = allUploaded.filter(d => d.status !== 'REJECTED')
      const uploadedTypeIds = validUploaded.map(d => d.documentTypeId)
      const missing = required.filter(r => !uploadedTypeIds.includes(r.documentTypeId))
      if (missing.length > 0) {
        throw new ValidationError(`Cannot approve stage: student has not uploaded all required documents (${missing.map(m => m.documentType.name).join(', ')})`)
      }
    }

    const remainingUnapprovedStageIds = campaignStageIds.filter(
      id => id !== stageIdToApprove && !alreadyApprovedStageIds.includes(id)
    )
    const isFinalStage = remainingUnapprovedStageIds.length === 0

    if (isFinalStage) {
      // Validate issuedData
      const requiredFields = (clearance.campaign as any)?.issuedDataFields || []
      const providedFields = issuedData ? Object.keys(issuedData) : []
      const missing = requiredFields.filter((f: string) => !providedFields.includes(f) || !issuedData[f])
      if (missing.length > 0) {
        throw new ValidationError(`Missing required issued data fields: ${missing.join(', ')}`)
      }
    }

    const studentId = clearance.studentId
    const clearanceId = clearance.id

    // Use transaction with concurrency check
    await db.$transaction(async (tx) => {
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

      if (isFinalStage) {
        const clearanceNumber = `CLR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
        await tx.clearanceRequest.update({
          where: { id: clearanceId },
          data: {
            status: 'COMPLETED',
            currentStageId: null,
            stageStatus: 'APPROVED',
            completedAt: new Date(),
            clearanceNumber,
            issuedData,
          },
        })
      } else {
        const nextUnapprovedStage = campaignStages.find(s => remainingUnapprovedStageIds.includes(s.id))
        const nextStageId = nextUnapprovedStage?.id || clearance.currentStageId
        await tx.clearanceRequest.update({
          where: { id: clearanceId },
          data: {
            currentStageId: nextStageId,
            status: 'IN_PROGRESS',
            stageStatus: 'PENDING',
            updatedAt: new Date(),
          },
        })
      }
    })

    if (isFinalStage) {
      eventBus.emit('clearance.complete', { requestId, studentId, universityId })
    }
    eventBus.emit('stage.approved', { requestId, stageId: stageIdToApprove, officerId: officerUserId, universityId, studentId })

    return ClearanceRepository.findById(requestId, universityId)
  }

  static async reject(
    requestId: string,
    officerUserId: string,
    universityId: string,
    remarks: string,
    ipAddress?: string,
    stageId?: string
  ) {
    const clearance = await ClearanceRepository.findById(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')

    const officer = await OfficersRepository.findByUserId(officerUserId)
    if (!officer) throw new ForbiddenError('Officer profile not found')

    const campaignStages = await db.clearanceStage.findMany({
      where: { campaignId: clearance.campaignId, isActive: true },
      orderBy: { orderIndex: 'asc' },
    })
    const campaignStageIds = campaignStages.map(s => s.id)

    let stageIdToReject = stageId
    if (!stageIdToReject) {
      const candidateAssignment = officer.stageAssignments.find(a =>
        campaignStageIds.includes(a.stageId)
      )
      stageIdToReject = candidateAssignment?.stageId || clearance.currentStageId || undefined
    }
    if (!stageIdToReject) throw new ValidationError('No active stage to reject')

    const matchingAssignments = officer.stageAssignments.filter(a => a.stageId === stageIdToReject)
    if (matchingAssignments.length === 0) {
      throw new ForbiddenError('You are not assigned to this stage')
    }

    const authorized = matchingAssignments.some(a => {
      if (a.facultyId && a.facultyId !== clearance.student.facultyId) return false
      if (a.departmentId && a.departmentId !== clearance.student.departmentId) return false
      if (a.sessionId && a.sessionId !== clearance.sessionId) return false
      return true
    })
    if (!authorized) {
      throw new ForbiddenError('You are not authorized to review students outside your assigned faculty/department/session')
    }

    await ClearanceRepository.createStageApproval({
      universityId,
      requestId,
      stageId: stageIdToReject,
      officerId: officerUserId,
      status: 'REJECTED',
      remarks,
      ipAddress,
    })

    if (clearance.currentStageId === stageIdToReject) {
      await ClearanceRepository.updateStageStatus(requestId, 'REJECTED')
    } else {
      await db.clearanceRequest.update({
        where: { id: requestId },
        data: { updatedAt: new Date(), stageStatus: 'PENDING' },
      })
    }

    eventBus.emit('stage.rejected', {
      requestId,
      stageId: stageIdToReject,
      officerId: officerUserId,
      remarks,
      universityId,
      studentId: clearance.studentId,
    })
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
    const clearance = await ClearanceRepository.findForCertificate(requestId, universityId)
    if (!clearance) throw new NotFoundError('Clearance request not found')
    if (clearance.status !== 'COMPLETED') throw new ValidationError('Clearance not yet completed')
    const studentUserId = (clearance.student as any)?.user?.id || (clearance.student as any)?.userId
    if (role === 'STUDENT' && studentUserId && studentUserId !== userId) {
      throw new ForbiddenError('You do not have permission to download this certificate')
    }
    return clearance
  }

  static async generateCertificatePdf(requestId: string, universityId: string, userId?: string, role?: string) {
    const clearance = await this.getCertificate(requestId, universityId, userId, role)
    const pdfBytes = await CertificateGenerator.generate(clearance as any)
    const jambOrMatric = (clearance.student as any)?.jambRegNo || (clearance.student as any)?.matricNo || 'student'
    const fileName = `Clearance_Certificate_${jambOrMatric}.pdf`
    return {
      pdfBytes,
      fileName,
      clearance,
    }
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

