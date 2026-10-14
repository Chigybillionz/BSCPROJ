import { OfficersService } from './officers.service'
import { OfficersRepository } from './officers.repository'
import { ConflictError, NotFoundError, TierLimitError } from '@/core/errors/AppError'
import { db } from '@/lib/db'

jest.mock('./officers.repository')
jest.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: jest.fn(), create: jest.fn() },
    contractPlan: { findUnique: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn(), create: jest.fn() },
  },
}))

const mockOfficer = {
  id: 'officer-id', universityId: 'uni-id', userId: 'user-id',
  firstName: 'Ada', lastName: 'Obi',
  createdAt: new Date(), updatedAt: new Date(),
}

describe('OfficersService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getById', () => {
    it('should return officer when found', async () => {
      jest.spyOn(OfficersRepository, 'findById').mockResolvedValue(mockOfficer as any)
      const result = await OfficersService.getById('officer-id', 'uni-id')
      expect(result.firstName).toBe('Ada')
    })

    it('should throw NotFoundError when not found', async () => {
      jest.spyOn(OfficersRepository, 'findById').mockResolvedValue(null)
      await expect(OfficersService.getById('bad-id', 'uni-id')).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('should throw TierLimitError when officer limit reached', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'TRIAL' })
      jest.spyOn(OfficersRepository, 'count').mockResolvedValue(3)

      await expect(OfficersService.create('uni-id', { email: 'a@b.com', firstName: 'A', lastName: 'B' }))
        .rejects.toThrow(TierLimitError)
    })

    it('should throw ConflictError when email already in use', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'STANDARD' })
      jest.spyOn(OfficersRepository, 'count').mockResolvedValue(0)
      ;(db.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' })

      await expect(OfficersService.create('uni-id', { email: 'exists@uni.ng', firstName: 'A', lastName: 'B' }))
        .rejects.toThrow(ConflictError)
    })

    it('should create officer and assign to stage when stageId is provided', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'STANDARD' })
      jest.spyOn(OfficersRepository, 'count').mockResolvedValue(0)
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.user.create as jest.Mock).mockResolvedValue({ id: 'user-1', email: 'officer@uni.ng', role: 'OFFICER', isActive: true })
      jest.spyOn(OfficersRepository, 'create').mockResolvedValue(mockOfficer as any)
      const assignSpy = jest.spyOn(OfficersRepository, 'assign').mockResolvedValue({ id: 'assignment-1', stageId: 'stage-1', officerId: 'officer-id' } as any)

      const result = await OfficersService.create('uni-id', {
        email: 'officer@uni.ng',
        firstName: 'Ada',
        lastName: 'Obi',
        role: 'OFFICER',
        stageId: 'stage-1',
      })

      expect(result.firstName).toBe('Ada')
      expect(assignSpy).toHaveBeenCalledWith('uni-id', 'stage-1', 'officer-id', undefined, undefined, undefined)
      expect(result.stageAssignments).toHaveLength(1)
    })

    it('should create user with ADMIN role when specified', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'STANDARD' })
      jest.spyOn(OfficersRepository, 'count').mockResolvedValue(0)
      ;(db.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(db.user.create as jest.Mock).mockResolvedValue({ id: 'user-admin', email: 'admin@uni.ng', role: 'ADMIN', isActive: true })
      jest.spyOn(OfficersRepository, 'create').mockResolvedValue(mockOfficer as any)

      await OfficersService.create('uni-id', {
        email: 'admin@uni.ng',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'ADMIN',
      })

      expect(db.user.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ role: 'ADMIN' })
      }))
    })
  })

  describe('update', () => {
    it('should throw NotFoundError when officer not found', async () => {
      jest.spyOn(OfficersRepository, 'findById').mockResolvedValue(null)
      await expect(OfficersService.update('bad-id', 'uni-id', { firstName: 'New' })).rejects.toThrow(NotFoundError)
    })
  })

  describe('delete', () => {
    it('should delete when officer exists', async () => {
      jest.spyOn(OfficersRepository, 'findById').mockResolvedValue(mockOfficer as any)
      const spy = jest.spyOn(OfficersRepository, 'delete').mockResolvedValue(mockOfficer as any)
      await OfficersService.delete('officer-id', 'uni-id')
      expect(spy).toHaveBeenCalledWith('officer-id')
    })
  })
})
