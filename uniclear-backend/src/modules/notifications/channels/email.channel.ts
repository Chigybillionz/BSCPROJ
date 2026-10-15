import nodemailer from 'nodemailer'
import { env } from '@/core/config/env'
import { logger } from '@/core/logger/logger'

interface InviteEmailPayload {
  to: string
  name: string
  role: string
  inviteLink: string
  tempPassword: string
}

async function sendViaMailpit(payload: InviteEmailPayload): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  })

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: `You've been invited to UniClear as ${payload.role}`,
    html: buildInviteHtml(payload),
  })

  logger.info({ to: payload.to }, 'Invite email sent via Mailpit → http://localhost:8025')
}

async function sendViaResend(payload: InviteEmailPayload): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: payload.to,
      subject: `You've been invited to UniClear as ${payload.role}`,
      html: buildInviteHtml(payload),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    logger.error({ err }, 'Resend email failed')
    throw new Error(`Resend error: ${err}`)
  }

  logger.info({ to: payload.to }, 'Invite email sent via Resend')
}

export async function sendInviteEmail(payload: InviteEmailPayload): Promise<void> {
  try {
    if (env.EMAIL_PROVIDER === 'resend') {
      await sendViaResend(payload)
    } else {
      await sendViaMailpit(payload)
    }
  } catch (err) {
    // Email failure should never crash the invite flow — log and continue
    logger.error({ err, to: payload.to }, 'Failed to send invite email — invite link still returned in response')
  }
}

function buildInviteHtml(payload: InviteEmailPayload): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
      <h2 style="color:#0f172a">Welcome to UniClear</h2>
      <p style="color:#334155;font-size:14px">You have been invited to join UniClear as <strong>${payload.role}</strong>.</p>
      ${payload.tempPassword ? `<p style="color:#334155;font-size:14px">Temporary password: <code>${payload.tempPassword}</code></p>` : ''}
      <div style="margin:24px 0">
        <a href="${payload.inviteLink}" style="background:#1B4F72;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          Accept Invitation
        </a>
      </div>
      <p style="color:#64748b;font-size:12px">Or copy this link: ${payload.inviteLink}</p>
    </div>
  `
}

export interface ClearanceStatusEmailPayload {
  to: string
  studentName: string
  stageName: string
  status: 'APPROVED' | 'REJECTED' | 'COMPLETED'
  remarks?: string
  dashboardLink: string
}

export async function sendClearanceStatusEmail(payload: ClearanceStatusEmailPayload): Promise<void> {
  const isApproved = payload.status === 'APPROVED'
  const isCompleted = payload.status === 'COMPLETED'
  const subject = isCompleted
    ? '🎉 Congratulations! Your University Clearance is COMPLETE!'
    : isApproved
    ? `Your ${payload.stageName} clearance was approved!`
    : `Action Required: Your ${payload.stageName} clearance was rejected`

  const html = buildClearanceStatusHtml(payload)

  try {
    if (env.EMAIL_PROVIDER === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: payload.to,
          subject,
          html,
        }),
      })
      if (!res.ok) {
        const err = await res.text()
        logger.error({ err }, 'Resend clearance status email failed')
      } else {
        logger.info({ to: payload.to, status: payload.status }, 'Clearance status email sent via Resend')
      }
    } else {
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: false,
      })

      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: payload.to,
        subject,
        html,
      })

      logger.info({ to: payload.to, status: payload.status }, 'Clearance status email sent via Mailpit → http://localhost:8025')
    }
  } catch (err) {
    logger.error({ err, to: payload.to }, 'Failed to send clearance status email')
  }
}

function buildClearanceStatusHtml({ studentName, stageName, status, remarks, dashboardLink }: ClearanceStatusEmailPayload): string {
  const isApproved = status === 'APPROVED'
  const isCompleted = status === 'COMPLETED'
  const headerBg = isCompleted ? '#166534' : isApproved ? '#1B4F72' : '#991B1B'
  const badgeColor = isCompleted ? '#22c55e' : isApproved ? '#38bdf8' : '#ef4444'

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px">
      <div style="background:${headerBg};padding:24px;border-radius:8px;text-align:center;margin-bottom:24px">
        <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px">UniClear System</h1>
        <p style="color:#e2e8f0;margin:6px 0 0 0;font-size:13px">Official University Clearance Portal</p>
      </div>

      <div style="margin-bottom:20px">
        <span style="display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;background:${badgeColor}">
          ${status}
        </span>
      </div>

      <h2 style="color:#0f172a;font-size:18px;margin:0 0 12px 0">
        ${isCompleted ? 'Clearance Completed Successfully!' : `Update regarding: ${stageName}`}
      </h2>

      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px 0">
        Hello <strong>${studentName}</strong>,
      </p>

      <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 16px 0">
        ${isCompleted
          ? 'Congratulations! All of your departmental clearance stages have been reviewed and approved. Your digital clearance certificate is now official and ready for download.'
          : isApproved
          ? `Great news! Your <strong>${stageName}</strong> stage has been thoroughly reviewed and <strong>APPROVED</strong> by the designated clearance officer. You may now proceed to your next clearance stage.`
          : `Your submission for <strong>${stageName}</strong> was <strong>REJECTED</strong> by the clearance officer.`
        }
      </p>

      ${!isApproved && !isCompleted && remarks ? `
        <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px 16px;margin:16px 0;border-radius:4px">
          <p style="margin:0;font-size:13px;font-weight:600;color:#991B1B">Officer Remarks / Reason:</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#7f1d1d">${remarks}</p>
        </div>
      ` : ''}

      <div style="text-align:center;margin:32px 0">
        <a href="${dashboardLink}" style="display:inline-block;background:#1B4F72;color:#ffffff;padding:12px 28px;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none">
          Open Clearance Dashboard
        </a>
      </div>

      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0" />

      <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
        This is an automated clearance notification from UniClear. Please do not reply directly to this email.
      </p>
    </div>
  `
}

