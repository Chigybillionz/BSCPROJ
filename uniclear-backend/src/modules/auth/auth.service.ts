import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { AuthRepository } from './auth.repository'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt/jwt'
import { AuthError, NotFoundError, ValidationError } from '@/core/errors/AppError'
import { LoginResponse } from './auth.types'
import { logger } from '@/core/logger/logger'
import { sendInviteEmail } from '@/modules/notifications/channels/email.channel'
import { env } from '@/core/config/env'

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponse> {
    const user = await AuthRepository.findUserByEmail(email)
    if (!user) throw new AuthError('Invalid credentials')
    if (!user.isActive) throw new AuthError('Account is inactive')
    if (!user.passwordSetAt) throw new AuthError('Password not set. Check your invite email.')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new AuthError('Invalid credentials')

    const accessToken = signAccessToken({ sub: user.id, universityId: user.universityId, role: user.role })
    const refreshToken = signRefreshToken({ sub: user.id })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await AuthRepository.saveRefreshToken(user.id, refreshToken, expiresAt)

    if (user.universityId) {
      import('@/modules/audit/audit.service').then(({ AuditService }) => {
        AuditService.log({
          universityId: user.universityId!,
          actorId: user.id,
          action: 'USER_LOGIN',
          targetId: user.id,
          targetType: 'User',
          metadata: { email: user.email, role: user.role },
        }).catch(() => {})
      }).catch(() => {})
    }

    return { 
      accessToken, 
      refreshToken, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        universityId: user.universityId, 
        universitySlug: user.university?.slug ?? null,
        student: user.student,
        officer: user.officer
      } 
    }
  }

  static async register(data: {
    universitySlug: string
    firstName: string
    lastName: string
    email: string
    jambRegNo: string
    facultyId: string
    departmentId: string
    password: string
    phone?: string
    level?: string
  }): Promise<LoginResponse> {
    const { db } = await import('@/lib/db')
    const university = await db.university.findFirst({
      where: {
        OR: [{ slug: data.universitySlug }, { id: data.universitySlug }],
        isActive: true,
      },
    })
    if (!university) throw new NotFoundError('University not found or inactive')

    // Verify Faculty exists in this university
    const faculty = await db.faculty.findFirst({
      where: { id: data.facultyId, universityId: university.id },
    })
    if (!faculty) throw new ValidationError('Invalid faculty selected for this university')

    // Verify Department exists in this faculty
    const department = await db.department.findFirst({
      where: { id: data.departmentId, facultyId: data.facultyId },
    })
    if (!department) throw new ValidationError('Invalid department selected for this faculty')

    // Check if email already in use
    const normalizedEmail = data.email.toLowerCase().trim()
    const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) throw new AuthError('An account with this email address already exists.')

    // Check if JAMB Reg No is already claimed
    const normalizedJamb = data.jambRegNo.trim()
    const studentRecord = await db.student.findUnique({
      where: {
        universityId_jambRegNo: {
          universityId: university.id,
          jambRegNo: normalizedJamb,
        },
      },
    })

    if (studentRecord && studentRecord.userId) {
      throw new AuthError('An account has already been registered for this JAMB Registration Number.')
    }

    const hash = await bcrypt.hash(data.password, 12)
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hash,
        role: 'STUDENT',
        universityId: university.id,
        passwordSetAt: new Date(),
        isActive: true,
      },
    })

    let student
    if (studentRecord) {
      student = await db.student.update({
        where: { id: studentRecord.id },
        data: {
          userId: user.id,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          facultyId: data.facultyId,
          departmentId: data.departmentId,
          phone: data.phone || studentRecord.phone,
          level: data.level || studentRecord.level || '100',
        },
        include: { faculty: true, department: true },
      })
    } else {
      student = await db.student.create({
        data: {
          universityId: university.id,
          userId: user.id,
          jambRegNo: normalizedJamb,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          facultyId: data.facultyId,
          departmentId: data.departmentId,
          phone: data.phone,
          level: data.level || '100',
        },
        include: { faculty: true, department: true },
      })
    }

    const accessToken = signAccessToken({ sub: user.id, universityId: university.id, role: user.role })
    const refreshToken = signRefreshToken({ sub: user.id })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await AuthRepository.saveRefreshToken(user.id, refreshToken, expiresAt)

    return { 
      accessToken, 
      refreshToken, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role, 
        universityId: university.id, 
        universitySlug: university.slug,
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          jambRegNo: student.jambRegNo,
          facultyId: student.facultyId,
          departmentId: student.departmentId,
          level: student.level,
          faculty: student.faculty ? { id: student.faculty.id, name: student.faculty.name } : null,
          department: student.department ? { id: student.department.id, name: student.department.name } : null,
        },
      },
    }
  }

  static async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await AuthRepository.findRefreshToken(token)
    if (!stored || stored.expiresAt < new Date()) throw new AuthError('Invalid or expired refresh token')

    const payload = verifyRefreshToken(token)
    const { user } = stored
    if (!user) throw new AuthError('Invalid or expired refresh token')

    await AuthRepository.deleteRefreshToken(token)

    const accessToken = signAccessToken({ sub: payload.sub, universityId: user.universityId, role: user.role })
    const refreshToken = signRefreshToken({ sub: payload.sub })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await AuthRepository.saveRefreshToken(user.id, refreshToken, expiresAt)

    return { accessToken, refreshToken }
  }

  static async logout(token: string): Promise<void> {
    await AuthRepository.deleteRefreshToken(token).catch(() => {})
  }

  static async setPassword(userId: string, password: string): Promise<void> {
    const user = await AuthRepository.findUserById(userId)
    if (!user) throw new NotFoundError('User not found')
    if (user.passwordSetAt) throw new ValidationError('Password already set')

    const hash = await bcrypt.hash(password, 12)
    await AuthRepository.updatePassword(userId, hash)
    await AuthRepository.deleteAllUserRefreshTokens(userId)
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await AuthRepository.findUserWithPasswordById(userId)
    if (!user) throw new NotFoundError('User not found')

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new AuthError('Current password is incorrect')

    const hash = await bcrypt.hash(newPassword, 12)
    await AuthRepository.updatePassword(userId, hash)
    await AuthRepository.deleteAllUserRefreshTokens(userId)
  }

  static async forgotPassword(email: string): Promise<void> {
    const user = await AuthRepository.findUserByEmail(email)
    if (!user || !user.isActive) return

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    await AuthRepository.savePasswordResetToken(user.id, token, expiresAt)

    const resetLink = `${env.APP_URL}/set-password?token=${token}`
    logger.info({ email, resetLink }, 'Password reset requested')

    await sendInviteEmail({
      to: email,
      name: email,
      role: 'password reset',
      inviteLink: resetLink,
      tempPassword: '',
    })
  }

  static async resetPassword(token: string, password: string): Promise<void> {
    const record = await AuthRepository.findPasswordResetToken(token)
    if (!record) throw new ValidationError('Invalid or expired reset token')
    if (record.usedAt) throw new ValidationError('Reset token has already been used')
    if (record.expiresAt < new Date()) throw new ValidationError('Reset token has expired')

    const hash = await bcrypt.hash(password, 12)
    await AuthRepository.updatePassword(record.userId, hash)
    await AuthRepository.markPasswordResetTokenUsed(record.id)
    await AuthRepository.deleteAllUserRefreshTokens(record.userId)
  }

  static async getMe(userId: string) {
    const user = await AuthRepository.findUserById(userId)
    if (!user) throw new NotFoundError('User not found')
    return user
  }
}
