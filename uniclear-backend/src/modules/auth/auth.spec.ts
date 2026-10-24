import { AuthService } from './auth.service'
import { AuthRepository } from './auth.repository'
import { AuthError, NotFoundError, ValidationError } from '@/core/errors/AppError'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

jest.mock('./auth.repository')
jest.mock('@/lib/jwt/jwt', () => ({
  signAccessToken:    jest.fn().mockReturnValue('access-token'),
  signRefreshToken:   jest.fn().mockReturnValue('refresh-token'),
  verifyRefreshToken: jest.fn().mockReturnValue({ sub: 'user-id' }),
}))
jest.mock('@/lib/db', () => ({
  db: {
    university: { findFirst: jest.fn(), findUnique: jest.fn() },
    faculty: { findFirst: jest.fn() },
    department: { findFirst: jest.fn() },
    user: { findUnique: jest.fn(), create: jest.fn() },
    student: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))

const mockUser = {
  id: 'user-id', email: 'test@unn.edu.ng', role: 'STUDENT' as const,
  universityId: 'uni-id', isActive: true,
  passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
  passwordSetAt: new Date(), officer: null,
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('mocked-hash' as never)
    jest.spyOn(bcrypt, 'compare').mockImplementation((async (plain: unknown) => plain === 'password123') as any)
  })

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(mockUser as any)
      jest.spyOn(AuthRepository, 'saveRefreshToken').mockResolvedValue({} as any)

      const result = await AuthService.login('test@unn.edu.ng', 'password123')

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
      expect(result.user.email).toBe('test@unn.edu.ng')
    })

    it('should throw AuthError on invalid password', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(mockUser as any)

      await expect(AuthService.login('test@unn.edu.ng', 'wrongpassword'))
        .rejects.toThrow(AuthError)
    })

    it('should throw AuthError when user not found', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null)

      await expect(AuthService.login('notfound@unn.edu.ng', 'password123'))
        .rejects.toThrow(AuthError)
    })

    it('should throw AuthError when account is inactive', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({ ...mockUser, isActive: false } as any)

      await expect(AuthService.login('test@unn.edu.ng', 'password123'))
        .rejects.toThrow(AuthError)
    })

    it('should throw AuthError when password not set yet', async () => {
      jest.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({ ...mockUser, passwordSetAt: null } as any)

      await expect(AuthService.login('test@unn.edu.ng', 'password123'))
        .rejects.toThrow(AuthError)
    })
  })

  describe('register', () => {
    const validRegisterData = {
      universitySlug: 'unn',
      firstName: 'Adaeze',
      lastName: 'Nwosu',
      email: 'adaeze@unn.edu.ng',
      jambRegNo: '202210067841FA',
      facultyId: 'fac-1',
      departmentId: 'dept-1',
      password: 'Password@123',
    }

    it('should successfully register a new student and return tokens', async () => {
      ;(db.university.findFirst as jest.Mock).mockResolvedValue({ id: 'uni-1', slug: 'unn', isActive: true })
      ;(db.faculty.findFirst as jest.Mock).mockResolvedValue({ id: 'fac-1', name: 'Physical Sciences' })
      ;(db.department.findFirst as jest.Mock).mockResolvedValue({ id: 'dept-1', name: 'Computer Science' })
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.student.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.user.create as jest.Mock).mockResolvedValue({
        id: 'new-user-id',
        email: 'adaeze@unn.edu.ng',
        role: 'STUDENT',
        universityId: 'uni-1',
      })
      ;(db.student.create as jest.Mock).mockResolvedValue({
        id: 'new-student-id',
        universityId: 'uni-1',
        userId: 'new-user-id',
        jambRegNo: '202210067841FA',
        firstName: 'Adaeze',
        lastName: 'Nwosu',
        facultyId: 'fac-1',
        departmentId: 'dept-1',
        level: '100',
        faculty: { id: 'fac-1', name: 'Physical Sciences' },
        department: { id: 'dept-1', name: 'Computer Science' },
      })
      jest.spyOn(AuthRepository, 'saveRefreshToken').mockResolvedValue({} as any)

      const result = await AuthService.register(validRegisterData)

      expect(result.accessToken).toBe('access-token')
      expect(result.refreshToken).toBe('refresh-token')
      expect(result.user.email).toBe('adaeze@unn.edu.ng')
      expect(result.user.student.jambRegNo).toBe('202210067841FA')
      expect(result.user.student.firstName).toBe('Adaeze')
      expect(db.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          role: 'STUDENT',
          email: 'adaeze@unn.edu.ng',
        }),
      }))
    })

    it('should throw NotFoundError if university is not found', async () => {
      ;(db.university.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(AuthService.register(validRegisterData)).rejects.toThrow(NotFoundError)
    })

    it('should throw ValidationError if faculty is not found in university', async () => {
      ;(db.university.findFirst as jest.Mock).mockResolvedValue({ id: 'uni-1', slug: 'unn', isActive: true })
      ;(db.faculty.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(AuthService.register(validRegisterData)).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError if department is not found in faculty', async () => {
      ;(db.university.findFirst as jest.Mock).mockResolvedValue({ id: 'uni-1', slug: 'unn', isActive: true })
      ;(db.faculty.findFirst as jest.Mock).mockResolvedValue({ id: 'fac-1' })
      ;(db.department.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(AuthService.register(validRegisterData)).rejects.toThrow(ValidationError)
    })

    it('should throw AuthError if email already exists', async () => {
      ;(db.university.findFirst as jest.Mock).mockResolvedValue({ id: 'uni-1', slug: 'unn', isActive: true })
      ;(db.faculty.findFirst as jest.Mock).mockResolvedValue({ id: 'fac-1' })
      ;(db.department.findFirst as jest.Mock).mockResolvedValue({ id: 'dept-1' })
      ;(db.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-id' })

      await expect(AuthService.register(validRegisterData)).rejects.toThrow(AuthError)
    })

    it('should throw AuthError if JAMB Reg No is already claimed', async () => {
      ;(db.university.findFirst as jest.Mock).mockResolvedValue({ id: 'uni-1', slug: 'unn', isActive: true })
      ;(db.faculty.findFirst as jest.Mock).mockResolvedValue({ id: 'fac-1' })
      ;(db.department.findFirst as jest.Mock).mockResolvedValue({ id: 'dept-1' })
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.student.findUnique as jest.Mock).mockResolvedValue({ id: 'stu-1', userId: 'another-user-id' })

      await expect(AuthService.register(validRegisterData)).rejects.toThrow(AuthError)
    })
  })

  describe('setPassword', () => {
    it('should set password for new user', async () => {
      jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue({ ...mockUser, passwordSetAt: null } as any)
      jest.spyOn(AuthRepository, 'updatePassword').mockResolvedValue({} as any)

      await expect(AuthService.setPassword('user-id', 'NewPass@123')).resolves.not.toThrow()
    })

    it('should throw ValidationError if password already set', async () => {
      jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue(mockUser as any)

      await expect(AuthService.setPassword('user-id', 'NewPass@123'))
        .rejects.toThrow(ValidationError)
    })
  })

  describe('logout', () => {
    it('should delete refresh token', async () => {
      const spy = jest.spyOn(AuthRepository, 'deleteRefreshToken').mockResolvedValue({} as any)
      await AuthService.logout('refresh-token')
      expect(spy).toHaveBeenCalledWith('refresh-token')
    })
  })

  describe('getMe', () => {
    it('should return user by id', async () => {
      jest.spyOn(AuthRepository, 'findUserById').mockResolvedValue(mockUser as any)
      const result = await AuthService.getMe('user-id')
      expect(result.email).toBe('test@unn.edu.ng')
    })
  })
})
