import { UniversitiesService } from './universities.service'
import { UniversitiesRepository } from './universities.repository'
import { ConflictError, NotFoundError } from '@/core/errors/AppError'

jest.mock('./universities.repository')
jest.mock('@/modules/notifications/channels/email.channel', () => ({
  sendInviteEmail: jest.fn().mockResolvedValue({}),
}))
jest.mock('@/modules/auth/auth.repository', () => ({
  AuthRepository: {
    saveInviteToken: jest.fn().mockResolvedValue({}),
  },
}))

jest.mock('@/lib/db', () => ({
  db: {
    user: {
      create: jest.fn().mockResolvedValue({ id: 'user-id' }),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}))

const mockUniversity = {
  id: 'uni-id', name: 'University of Nigeria, Nsukka', slug: 'unn',
  abbreviation: 'UNN', primaryColor: '#1B4F72', accentColor: '#2980B9',
  address: 'Nsukka', contactEmail: 'reg@unn.edu.ng', isActive: true,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('UniversitiesService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getById', () => {
    it('should return university when found', async () => {
      jest.spyOn(UniversitiesRepository, 'findById').mockResolvedValue(mockUniversity as any)
      const result = await UniversitiesService.getById('uni-id')
      expect(result.slug).toBe('unn')
    })

    it('should throw NotFoundError when not found', async () => {
      jest.spyOn(UniversitiesRepository, 'findById').mockResolvedValue(null)
      await expect(UniversitiesService.getById('bad-id')).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('should throw ConflictError when slug already in use', async () => {
      jest.spyOn(UniversitiesRepository, 'findBySlug').mockResolvedValue(mockUniversity as any)

      await expect(UniversitiesService.create({
        name: 'Test Uni', slug: 'unn', abbreviation: 'TU',
        address: 'Test', contactEmail: 'test@test.com',
        primaryColor: '#000', accentColor: '#fff', tier: 'TRIAL',
      })).rejects.toThrow(ConflictError)
    })

    it('should create university when slug is unique', async () => {
      jest.spyOn(UniversitiesRepository, 'findBySlug').mockResolvedValue(null)
      jest.spyOn(UniversitiesRepository, 'create').mockResolvedValue(mockUniversity as any)
      jest.spyOn(UniversitiesRepository, 'upsertContract').mockResolvedValue({} as any)

      const result = await UniversitiesService.create({
        name: 'University of Nigeria', slug: 'unn', abbreviation: 'UNN',
        address: 'Nsukka', contactEmail: 'reg@unn.edu.ng',
        primaryColor: '#1B4F72', accentColor: '#2980B9', tier: 'STANDARD',
      })
      expect(result.slug).toBe('unn')
    })
  })

  describe('suspend', () => {
    it('should throw NotFoundError when university not found', async () => {
      jest.spyOn(UniversitiesRepository, 'findById').mockResolvedValue(null)
      await expect(UniversitiesService.suspend('bad-id')).rejects.toThrow(NotFoundError)
    })

    it('should suspend university', async () => {
      jest.spyOn(UniversitiesRepository, 'findById').mockResolvedValue(mockUniversity as any)
      const spy = jest.spyOn(UniversitiesRepository, 'suspend').mockResolvedValue({ ...mockUniversity, isActive: false } as any)
      await UniversitiesService.suspend('uni-id')
      expect(spy).toHaveBeenCalledWith('uni-id')
    })
  })
})
