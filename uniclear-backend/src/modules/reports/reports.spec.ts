import { ReportsService } from './reports.service'
import { db } from '@/lib/db'

jest.mock('@/lib/db', () => ({
  db: {
    student:          { count: jest.fn() },
    clearanceRequest: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
    clearanceStage:   { findMany: jest.fn().mockResolvedValue([]) },
    stageApproval:    { count: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
  },
}))

describe('ReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(db.clearanceRequest.findMany as jest.Mock).mockResolvedValue([])
    ;(db.clearanceRequest.groupBy as jest.Mock).mockResolvedValue([])
    ;(db.stageApproval.groupBy as jest.Mock).mockResolvedValue([])
  })

  describe('summary', () => {
    it('should return correct summary stats', async () => {
      ;(db.student.count as jest.Mock).mockResolvedValue(100)
      ;(db.clearanceRequest.count as jest.Mock)
        .mockResolvedValueOnce(80)   // total
        .mockResolvedValueOnce(50)   // completed
        .mockResolvedValueOnce(30)   // inProgress
      ;(db.clearanceRequest.findMany as jest.Mock).mockResolvedValue([])

      const result = await ReportsService.summary('uni-id')
      expect(result.totalStudents).toBe(100)
      expect(result.completed).toBe(50)
      expect(result.completionRate).toBe('62.5')
    })

    it('should return 0 completion rate when no clearances', async () => {
      ;(db.student.count as jest.Mock).mockResolvedValue(50)
      ;(db.clearanceRequest.count as jest.Mock).mockResolvedValue(0)
      ;(db.clearanceRequest.findMany as jest.Mock).mockResolvedValue([])

      const result = await ReportsService.summary('uni-id')
      expect(result.completionRate).toBe('0')
    })
  })

  describe('byStage', () => {
    it('should return breakdown per stage', async () => {
      ;(db.clearanceStage.findMany as jest.Mock).mockResolvedValue([
        { id: 'stage-1', name: 'Library', orderIndex: 1 },
      ])
      ;(db.clearanceRequest.groupBy as jest.Mock).mockResolvedValue([
        { currentStageId: 'stage-1', _count: 10 },
      ])
      ;(db.stageApproval.groupBy as jest.Mock)
        .mockResolvedValueOnce([{ stageId: 'stage-1', _count: 8 }])  // approved
        .mockResolvedValueOnce([{ stageId: 'stage-1', _count: 2 }])  // rejected

      const result = await ReportsService.byStage('uni-id')
      expect(result).toHaveLength(1)
      expect(result[0].stage.name).toBe('Library')
      expect(result[0].pending).toBe(10)
      expect(result[0].approved).toBe(8)
      expect(result[0].rejected).toBe(2)
    })
  })
})
