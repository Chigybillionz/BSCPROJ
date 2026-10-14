import { eventBus } from './EventBus'
import { AuditService } from '@/modules/audit/audit.service'
import { NotificationsService } from '@/modules/notifications/notification.service'
import { db } from '@/lib/db'

export function registerListeners() {
  // ── Clearance started ──────────────────────────────────────────
  eventBus.on('clearance.started', async ({ clearanceId, studentId, universityId }) => {
    await AuditService.log({ universityId, actorId: studentId, action: 'CLEARANCE_STARTED', targetId: clearanceId, targetType: 'ClearanceRequest' })
  })

  // ── Stage submitted ────────────────────────────────────────────
  eventBus.on('stage.submitted', async ({ requestId, stageId, studentId, universityId }) => {
    await AuditService.log({ universityId, actorId: studentId, action: 'STAGE_SUBMITTED', targetId: requestId, targetType: 'ClearanceRequest', metadata: { stageId } })

    // Notify officer
    const stage = await db.clearanceStage.findUnique({ where: { id: stageId }, include: { officerAssignments: { include: { officer: true } } } })
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
    await AuditService.log({ universityId, actorId: officerId, action: 'STAGE_APPROVED', targetId: requestId, targetType: 'ClearanceRequest', metadata: { stageId } })

    const [stage, student] = await Promise.all([
      db.clearanceStage.findUnique({ where: { id: stageId } }),
      db.student.findUnique({ where: { id: studentId }, include: { user: true } }),
    ])

    const stageName = stage?.name || 'Clearance Stage'
    const targetUserId = student?.userId || studentId

    await NotificationsService.send(
      universityId, targetUserId, 'STAGE_APPROVED',
      `Your ${stageName} was approved!`,
      `Your ${stageName} stage has been approved. Proceed to the next stage.`
    )

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
    await AuditService.log({ universityId, actorId: officerId, action: 'STAGE_REJECTED', targetId: requestId, targetType: 'ClearanceRequest', metadata: { stageId, remarks } })

    const [stage, student] = await Promise.all([
      db.clearanceStage.findUnique({ where: { id: stageId } }),
      db.student.findUnique({ where: { id: studentId }, include: { user: true } }),
    ])

    const stageName = stage?.name || 'Clearance Stage'
    const targetUserId = student?.userId || studentId

    await NotificationsService.send(
      universityId, targetUserId, 'STAGE_REJECTED',
      `Your ${stageName} was rejected`,
      `Your ${stageName} stage was rejected. Reason: ${remarks}`,
      { remarks }
    )

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
    await AuditService.log({ universityId, actorId: studentId, action: 'CLEARANCE_COMPLETED', targetId: requestId, targetType: 'ClearanceRequest' })

    const student = await db.student.findUnique({ where: { id: studentId }, include: { user: true } })
    const targetUserId = student?.userId || studentId

    await NotificationsService.send(
      universityId, targetUserId, 'CLEARANCE_COMPLETE',
      '🎉 Clearance Complete!',
      'Congratulations! All your clearance stages have been approved. Your certificate is ready for download.'
    )

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
    await AuditService.log({ universityId, actorId: studentId, action: 'DOCUMENT_UPLOADED', targetId: documentId, targetType: 'Document' })
  })
}
