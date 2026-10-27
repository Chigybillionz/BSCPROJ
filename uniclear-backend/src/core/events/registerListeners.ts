import { eventBus } from './EventBus'
import { AuditService } from '@/modules/audit/audit.service'
import { NotificationsService } from '@/modules/notifications/notification.service'
import { db } from '@/lib/db'

async function getStudentUserId(studentId: string): Promise<string | null> {
  const s = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } })
  return s?.userId ?? null
}

export function registerListeners() {
  // ── Clearance started ──────────────────────────────────────────
  eventBus.on('clearance.started', async ({ clearanceId, studentId, universityId }) => {
    const actorId = await getStudentUserId(studentId)
    if (actorId) {
      await AuditService.log({ universityId, actorId, action: 'CLEARANCE_STARTED', targetId: clearanceId, targetType: 'ClearanceRequest' })
    }
  })

  // ── Stage submitted ────────────────────────────────────────────
  eventBus.on('stage.submitted', async ({ requestId, stageId, studentId, universityId }) => {
    const [actorId, stage, student] = await Promise.all([
      getStudentUserId(studentId),
      db.clearanceStage.findUnique({ where: { id: stageId }, include: { officerAssignments: { include: { officer: true } } } }),
      db.student.findUnique({ where: { id: studentId } }),
    ])

    const stageName = stage?.name || 'Clearance Stage'
    const studentName = student ? `${student.firstName} ${student.lastName}` : undefined

    if (actorId) {
      await AuditService.log({
        universityId,
        actorId,
        action: 'STAGE_SUBMITTED',
        targetId: requestId,
        targetType: 'ClearanceRequest',
        metadata: { stageId, stageName, studentName, jambRegNo: student?.jambRegNo },
      })
    }

    // Notify officer
    if (stage?.officerAssignments) {
      await Promise.all(
        stage.officerAssignments.map(assignment =>
          NotificationsService.send(universityId, assignment.officer.userId, 'DOCUMENT_UPLOADED', 'New submission', `A student has submitted documents for ${stage.name}`)
        )
      )
    }
  })

  // ── Stage approved ─────────────────────────────────────────────
  eventBus.on('stage.approved', async ({ requestId, stageId, officerId, universityId, studentId }) => {
    const [stage, student] = await Promise.all([
      db.clearanceStage.findUnique({ where: { id: stageId } }),
      db.student.findUnique({ where: { id: studentId }, include: { user: true } }),
    ])

    const stageName = stage?.name || 'Clearance Stage'
    const studentName = student ? `${student.firstName} ${student.lastName}` : undefined
    const targetUserId = student?.userId

    await AuditService.log({
      universityId,
      actorId: officerId,
      action: 'STAGE_APPROVED',
      targetId: requestId,
      targetType: 'ClearanceRequest',
      metadata: { stageId, stageName, studentName, jambRegNo: student?.jambRegNo },
    })

    if (targetUserId) {
      await NotificationsService.send(
        universityId, targetUserId, 'STAGE_APPROVED',
        `Your ${stageName} was approved!`,
        `Your ${stageName} stage has been approved. Proceed to the next stage.`
      )
    }

    if (student?.user?.email) {
      const { sendClearanceStatusEmail } = await import('@/modules/notifications/channels/email.channel')
      const { env } = await import('@/core/config/env')
      await sendClearanceStatusEmail({
        to: student.user.email,
        studentName: `${student.firstName} ${student.lastName}`,
        stageName,
        status: 'APPROVED',
        dashboardLink: `${env.APP_URL}/student/dashboard`,
      })
    }
  })

  // ── Stage rejected ─────────────────────────────────────────────
  eventBus.on('stage.rejected', async ({ requestId, stageId, officerId, remarks, universityId, studentId }) => {
    const [stage, student] = await Promise.all([
      db.clearanceStage.findUnique({ where: { id: stageId } }),
      db.student.findUnique({ where: { id: studentId }, include: { user: true } }),
    ])

    const stageName = stage?.name || 'Clearance Stage'
    const studentName = student ? `${student.firstName} ${student.lastName}` : undefined
    const targetUserId = student?.userId

    await AuditService.log({
      universityId,
      actorId: officerId,
      action: 'STAGE_REJECTED',
      targetId: requestId,
      targetType: 'ClearanceRequest',
      metadata: { stageId, stageName, remarks, studentName, jambRegNo: student?.jambRegNo },
    })

    if (targetUserId) {
      await NotificationsService.send(
        universityId, targetUserId, 'STAGE_REJECTED',
        `Your ${stageName} was rejected`,
        `Your ${stageName} stage was rejected. Reason: ${remarks}`,
        { remarks }
      )
    }

    if (student?.user?.email) {
      const { sendClearanceStatusEmail } = await import('@/modules/notifications/channels/email.channel')
      const { env } = await import('@/core/config/env')
      await sendClearanceStatusEmail({
        to: student.user.email,
        studentName: `${student.firstName} ${student.lastName}`,
        stageName,
        status: 'REJECTED',
        remarks,
        dashboardLink: `${env.APP_URL}/student/dashboard`,
      })
    }
  })

  // ── Clearance complete ─────────────────────────────────────────
  eventBus.on('clearance.complete', async ({ requestId, studentId, universityId }) => {
    const student = await db.student.findUnique({ where: { id: studentId }, include: { user: true } })
    const targetUserId = student?.userId || null

    if (targetUserId) {
      await AuditService.log({ universityId, actorId: targetUserId, action: 'CLEARANCE_COMPLETED', targetId: requestId, targetType: 'ClearanceRequest' })
    }

    if (targetUserId) {
      await NotificationsService.send(
        universityId, targetUserId, 'CLEARANCE_COMPLETE',
        '🎉 Clearance Complete!',
        'Congratulations! All your clearance stages have been approved. Your certificate is ready for download.'
      )
    }

    if (student?.user?.email) {
      const { sendClearanceStatusEmail } = await import('@/modules/notifications/channels/email.channel')
      const { env } = await import('@/core/config/env')
      await sendClearanceStatusEmail({
        to: student.user.email,
        studentName: `${student.firstName} ${student.lastName}`,
        stageName: 'All Clearance Stages',
        status: 'COMPLETED',
        dashboardLink: `${env.APP_URL}/student/dashboard`,
      })
    }
  })

  // ── Document uploaded ──────────────────────────────────────────
  eventBus.on('document.uploaded', async ({ documentId, studentId, universityId }) => {
    const actorId = await getStudentUserId(studentId)
    if (actorId) {
      await AuditService.log({ universityId, actorId, action: 'DOCUMENT_UPLOADED', targetId: documentId, targetType: 'Document' })
    }

    try {
      const doc = await db.document.findUnique({
        where: { id: documentId },
        include: {
          documentType: {
            include: {
              stageRequirements: {
                include: { stage: true },
              },
            },
          },
          student: {
            include: {
              faculty: true,
              department: true,
            },
          },
          request: {
            include: {
              currentStage: true,
            },
          },
        },
      })

      if (doc) {
        const candidateStageIds = new Set<string>()
        if (doc.request?.currentStageId) {
          candidateStageIds.add(doc.request.currentStageId)
        }
        doc.documentType?.stageRequirements?.forEach(sr => {
          if (sr.stageId) candidateStageIds.add(sr.stageId)
        })

        if (candidateStageIds.size > 0) {
          const assignments = await db.stageOfficerAssignment.findMany({
            where: {
              universityId,
              stageId: { in: Array.from(candidateStageIds) },
              AND: [
                {
                  OR: [
                    { sessionId: null },
                    ...(doc.request?.sessionId ? [{ sessionId: doc.request.sessionId }] : []),
                  ],
                },
                {
                  OR: [
                    { facultyId: null },
                    ...(doc.student?.facultyId ? [{ facultyId: doc.student.facultyId }] : []),
                  ],
                },
                {
                  OR: [
                    { departmentId: null },
                    ...(doc.student?.departmentId ? [{ departmentId: doc.student.departmentId }] : []),
                  ],
                },
              ],
            },
            include: {
              officer: true,
              stage: true,
            },
          })

          const uniqueOfficers = new Map<string, { userId: string; stageName: string }>()
          for (const a of assignments) {
            if (a.officer?.userId && !uniqueOfficers.has(a.officer.userId)) {
              uniqueOfficers.set(a.officer.userId, {
                userId: a.officer.userId,
                stageName: a.stage?.name || 'Assigned Stage',
              })
            }
          }

          const studentName = `${doc.student?.firstName || 'Student'} ${doc.student?.lastName || ''}`.trim()
          const docName = doc.documentType?.name || doc.fileName

          await Promise.all(
            Array.from(uniqueOfficers.values()).map(o =>
              NotificationsService.send(
                universityId,
                o.userId,
                'DOCUMENT_UPLOADED',
                'New Document Uploaded',
                `${studentName} uploaded "${docName}" for ${o.stageName}.`,
                {
                  requestId: doc.requestId,
                  studentId: doc.studentId,
                  documentId: doc.id,
                  documentName: docName,
                  studentName,
                  matricNo: doc.student?.matricNo || doc.student?.jambRegNo,
                  stageName: o.stageName,
                }
              )
            )
          )
        }
      }
    } catch (err) {
      console.error('[EventBus:document.uploaded] Error dispatching officer notifications:', err)
    }
  })
}

