import { StagesService } from './stages.service'
import { StagesRepository } from './stages.repository'
import { NotFoundError, TierLimitError } from '@/core/errors/AppError'
import { db } from '@/lib/db'

jest.mock('./stages.repository')
jest.mock('@/lib/db', () => ({
  db: {
    contractPlan: { findUnique: jest.fn() },
    clearanceCampaign: { findFirst: jest.fn() },
    clearanceStage: { findFirst: jest.fn(), findMany: jest.fn() },
  },
}))

const mockStage = {
  id: 'stage-id',
  universityId: 'uni-id',
  campaignId: 'camp-id',
  name: 'Library Clearance',
  orderIndex: 1,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('StagesService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(db.clearanceCampaign.findFirst as jest.Mock).mockResolvedValue({ id: 'camp-id', isActive: true })
    ;(db.clearanceStage.findFirst as jest.Mock).mockResolvedValue(null)
  })

  describe('getById', () => {
    it('should return stage when found', async () => {
      jest.spyOn(StagesRepository, 'findById').mockResolvedValue(mockStage as any)
      const result = await StagesService.getById('stage-id', 'uni-id')
      expect(result.name).toBe('Library Clearance')
    })

    it('should throw NotFoundError when not found', async () => {
      jest.spyOn(StagesRepository, 'findById').mockResolvedValue(null)
      await expect(StagesService.getById('bad-id', 'uni-id')).rejects.toThrow(NotFoundError)
    })
  })

  describe('create', () => {
    it('should throw TierLimitError when stage limit reached', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'TRIAL' })
      jest.spyOn(StagesRepository, 'count').mockResolvedValue(3)

      await expect(StagesService.create('uni-id', { campaignId: 'camp-id', name: 'New Stage', orderIndex: 4 }))
        .rejects.toThrow(TierLimitError)
    })

    it('should create stage within limit with explicit campaignId', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'STANDARD' })
      jest.spyOn(StagesRepository, 'count').mockResolvedValue(2)
      jest.spyOn(StagesRepository, 'create').mockResolvedValue(mockStage as any)

      const result = await StagesService.create('uni-id', { campaignId: 'camp-id', name: 'Library Clearance', orderIndex: 1 })
      expect(result.name).toBe('Library Clearance')
      expect(StagesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        universityId: 'uni-id',
        campaignId: 'camp-id',
        name: 'Library Clearance',
        orderIndex: 1,
      }))
    })

    it('should automatically resolve campaignId if omitted', async () => {
      ;(db.contractPlan.findUnique as jest.Mock).mockResolvedValue({ tier: 'STANDARD' })
      jest.spyOn(StagesRepository, 'count').mockResolvedValue(1)
      jest.spyOn(StagesRepository, 'create').mockResolvedValue(mockStage as any)

      const result = await StagesService.create('uni-id', { name: 'Library Clearance' })
      expect(result.name).toBe('Library Clearance')
      expect(StagesRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        universityId: 'uni-id',
        campaignId: 'camp-id',
      }))
    })
  })

  describe('update', () => {
    it('should update stage successfully', async () => {
      jest.spyOn(StagesRepository, 'findById').mockResolvedValue(mockStage as any)
      jest.spyOn(StagesRepository, 'update').mockResolvedValue({ ...mockStage, name: 'Updated Name' } as any)

      const result = await StagesService.update('stage-id', 'uni-id', { name: 'Updated Name', orderIndex: 2 })
      expect(result.name).toBe('Updated Name')
      expect(StagesRepository.update).toHaveBeenCalledWith('stage-id', { name: 'Updated Name', orderIndex: 2 })
    })
  })

  describe('reorder', () => {
    it('should reorder stages when tenant check passes', async () => {
      ;(db.clearanceStage.findMany as jest.Mock).mockResolvedValue([{ id: 'stage-1' }, { id: 'stage-2' }])
      jest.spyOn(StagesRepository, 'reorder').mockResolvedValue([] as any)

      await StagesService.reorder('uni-id', [
        { id: 'stage-1', orderIndex: 1 },
        { id: 'stage-2', orderIndex: 2 },
      ])
      expect(StagesRepository.reorder).toHaveBeenCalledWith([
        { id: 'stage-1', orderIndex: 1 },
        { id: 'stage-2', orderIndex: 2 },
      ])
    })

    it('should throw NotFoundError if stage does not belong to university', async () => {
      ;(db.clearanceStage.findMany as jest.Mock).mockResolvedValue([{ id: 'stage-1' }]) // missing stage-2

      await expect(StagesService.reorder('uni-id', [
        { id: 'stage-1', orderIndex: 1 },
        { id: 'stage-2', orderIndex: 2 },
      ])).rejects.toThrow(NotFoundError)
    })
  })

  describe('toggle', () => {
    it('should toggle isActive to false when currently true', async () => {
      jest.spyOn(StagesRepository, 'findById').mockResolvedValue(mockStage as any)
      const spy = jest.spyOn(StagesRepository, 'toggle').mockResolvedValue({ ...mockStage, isActive: false } as any)

      await StagesService.toggle('stage-id', 'uni-id')
      expect(spy).toHaveBeenCalledWith('stage-id', false)
    })
  })

  describe('delete', () => {
    it('should throw NotFoundError when stage not found', async () => {
      jest.spyOn(StagesRepository, 'findById').mockResolvedValue(null)
      await expect(StagesService.delete('bad-id', 'uni-id')).rejects.toThrow(NotFoundError)
    })
  })
})
