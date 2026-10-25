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

function createNodemailerTransporter() {
  if (env.EMAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: env.EMAIL_FROM,
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        refreshToken: env.GMAIL_REFRESH_TOKEN,
      },
    })
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  })
}

async function sendViaNodemailer(payload: InviteEmailPayload): Promise<void> {
  const transporter = createNodemailerTransporter()

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: payload.to,
    subject: `You've been invited to UniClear as ${payload.role}`,
    html: buildInviteHtml(payload),
  })

  const target = env.EMAIL_PROVIDER === 'gmail' ? 'Gmail OAuth2' : 'Mailpit → http://localhost:8025'
  logger.info({ to: payload.to }, `Invite email sent via ${target}`)
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
      await sendViaNodemailer(payload)
    }
  } catch (err) {
    // Email failure should never crash the invite flow — log and continue
    logger.error({ err, to: payload.to }, 'Failed to send invite email — invite link still returned in response')
  }
}

function buildInviteHtml({ name, role, inviteLink, tempPassword }: InviteEmailPayload): string {
  const isReset = role === 'password reset'

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1B4F72">${isReset ? 'Password Reset Request' : 'Welcome to UniClear'}</h2>
      <p>Hi ${name},</p>
      ${isReset
        ? `<p>We received a request to reset your password. Click the button below. This link expires in <strong>1 hour</strong>.</p>`
        : `<p>You've been invited to join UniClear as <strong>${role}</strong>.</p>
           <p>Your temporary password is:</p>
           <div style="background:#f4f4f4;padding:12px 20px;border-radius:6px;font-size:20px;letter-spacing:2px;font-weight:bold">${tempPassword}</div>
           <p style="margin-top:24px">Click the button below to set your own password:</p>`
      }
      <a href="${inviteLink}" style="display:inline-block;background:#1B4F72;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin-top:8px">
        ${isReset ? 'Reset Password' : 'Set My Password'}
      </a>
      <p style="margin-top:32px;color:#888;font-size:12px">
        ${isReset
          ? 'If you did not request a password reset, ignore this email.'
          : 'This link expires in 7 days. If you did not expect this invitation, ignore this email.'
        }
      </p>
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
      const transporter = createNodemailerTransporter()

      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: payload.to,
        subject,
        html,
      })

      const target = env.EMAIL_PROVIDER === 'gmail' ? 'Gmail OAuth2' : 'Mailpit → http://localhost:8025'
      logger.info({ to: payload.to, status: payload.status }, `Clearance status email sent via ${target}`)
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

