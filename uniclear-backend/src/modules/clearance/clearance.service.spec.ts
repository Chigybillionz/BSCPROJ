import { ClearanceService } from './clearance.service'
import { ClearanceRepository } from './clearance.repository'
import { DocumentTypesRepository } from '@/modules/document-types/document-types.repository'
import { DocumentsRepository } from '@/modules/documents/document.repository'
import { StudentsRepository } from '@/modules/students/students.repository'
import { OfficersRepository } from '@/modules/officers/officers.repository'
import { StagesRepository } from '@/modules/stages/stages.repository'
import { db } from '@/lib/db'
import { NotFoundError, ValidationError, ForbiddenError } from '@/core/errors/AppError'

jest.mock('./clearance.repository')
jest.mock('@/modules/document-types/document-types.repository')
jest.mock('@/modules/documents/document.repository')
jest.mock('@/modules/students/students.repository')
jest.mock('@/modules/officers/officers.repository')
jest.mock('@/modules/stages/stages.repository')
jest.mock('@/lib/db', () => ({
  db: {
    student: {
      findUnique: jest.fn(),
    },
    clearanceStage: {
      findUnique: jest.fn(),
    },
    clearanceRequest: {
      update: jest.fn(),
    },
  },
}))

describe('ClearanceService', () => {
  describe('submit', () => {
    const mockUniversityId = 'univ-1'
    const mockUserId = 'user-1'
    const mockRequestId = 'req-1'
    const mockStudentId = 'student-1'
    const mockStageId = 'stage-1'

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should throw ValidationError if required documents are missing', async () => {
      ;(ClearanceRepository.findById as jest.Mock).mockResolvedValue({
        id: mockRequestId,
        studentId: mockStudentId,
        sessionId: 'session-1',
        currentStageId: mockStageId,
        student: { userId: mockUserId },
      })
      ;(db.student.findUnique as jest.Mock).mockResolvedValue({ id: mockStudentId })
      ;(DocumentTypesRepository.findByStage as jest.Mock).mockResolvedValue([
        { documentTypeId: 'doc-type-1', isRequired: true, documentType: { name: 'O-Level Result' } },
      ])
      ;(DocumentsRepository.findByStage as jest.Mock).mockResolvedValue([])

      await expect(ClearanceService.submit(mockRequestId, mockUserId, mockUniversityId))
        .rejects
        .toThrow(ValidationError)

      await expect(ClearanceService.submit(mockRequestId, mockUserId, mockUniversityId))
        .rejects
        .toThrow('Missing required documents: O-Level Result')
    })

    it('should update the clearance stageStatus to SUBMITTED if all documents are present', async () => {
      ;(ClearanceRepository.findById as jest.Mock).mockResolvedValue({
        id: mockRequestId,
        studentId: mockStudentId,
        sessionId: 'session-1',
        currentStageId: mockStageId,
        student: { userId: mockUserId },
      })
      ;(db.student.findUnique as jest.Mock).mockResolvedValue({ id: mockStudentId })
      ;(DocumentTypesRepository.findByStage as jest.Mock).mockResolvedValue([
        { documentTypeId: 'doc-type-1', isRequired: true, documentType: { name: 'O-Level Result' } },
      ])
      ;(DocumentsRepository.findByStage as jest.Mock).mockResolvedValue([
        { documentTypeId: 'doc-type-1' },
      ])

      // We expect this new method to be called
      ;(ClearanceRepository.updateStageStatus as jest.Mock).mockResolvedValue(true)

      const result = await ClearanceService.submit(mockRequestId, mockUserId, mockUniversityId)

      expect(ClearanceRepository.updateStageStatus).toHaveBeenCalledWith(mockRequestId, 'SUBMITTED')
    })
  })

  describe('getStatus', () => {
    it('should return clearance requests for the student', async () => {
      ;(StudentsRepository.findByUserId as jest.Mock).mockResolvedValue({ id: 'student-1', userId: 'user-1' })
      ;(ClearanceRepository.findByStudent as jest.Mock).mockResolvedValue([
        { id: 'req-1', status: 'IN_PROGRESS', stageApprovals: [] },
      ])

      const result = await ClearanceService.getStatus('user-1', 'univ-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('req-1')
      expect(ClearanceRepository.findByStudent).toHaveBeenCalledWith('student-1', 'univ-1')
    })

    it('should throw NotFoundError if student profile is not found', async () => {
      ;(StudentsRepository.findByUserId as jest.Mock).mockResolvedValue(null)

      await expect(ClearanceService.getStatus('bad-user', 'univ-1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('getQueue', () => {
    it('should throw ForbiddenError if officer is not assigned to any stage', async () => {
      ;(OfficersRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'officer-1',
        stageAssignments: [],
      })

      await expect(ClearanceService.getQueue('user-1', 'univ-1', { page: 1, limit: 20 }))
        .rejects
        .toThrow(ForbiddenError)
    })

    it('should return clearance queue for assigned stages', async () => {
      ;(OfficersRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'officer-1',
        stageAssignments: [
          { stageId: 'stage-1', stage: { campaignId: 'camp-1' } },
        ],
      })
      ;(ClearanceRepository.findOfficerQueue as jest.Mock).mockResolvedValue({
        data: [{ id: 'req-1', student: { firstName: 'Chidi', lastName: 'Okafor' } }],
        total: 1,
      })

      const res = await ClearanceService.getQueue('user-1', 'univ-1', { page: 1, limit: 20 })
      expect(res.data).toHaveLength(1)
      expect(res.total).toBe(1)
      expect(ClearanceRepository.findOfficerQueue).toHaveBeenCalled()
    })
  })

  describe('approve', () => {
    it('should throw ForbiddenError if officer is not assigned to the clearance stage', async () => {
      ;(ClearanceRepository.findById as jest.Mock).mockResolvedValue({
        id: 'req-1',
        currentStageId: 'stage-1',
      })
      ;(OfficersRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'officer-1',
        stageAssignments: [{ stageId: 'other-stage' }],
      })

      await expect(ClearanceService.approve('req-1', 'officer-user', 'univ-1'))
        .rejects
        .toThrow(ForbiddenError)
    })

    it('should approve stage, create StageApproval, and advance currentStageId to next stage', async () => {
      ;(ClearanceRepository.findById as jest.Mock).mockResolvedValue({
        id: 'req-1',
        studentId: 'student-1',
        campaignId: 'camp-1',
        currentStageId: 'stage-1',
      })
      ;(OfficersRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'officer-1',
        stageAssignments: [{ stageId: 'stage-1' }],
      })
      ;(db.clearanceStage.findUnique as jest.Mock).mockResolvedValue({ id: 'stage-1', orderIndex: 1 })
      ;(StagesRepository.findNext as jest.Mock).mockResolvedValue({ id: 'stage-2', orderIndex: 2 })
      ;(ClearanceRepository.createStageApproval as jest.Mock).mockResolvedValue({ id: 'appr-1' })
      ;(ClearanceRepository.updateStage as jest.Mock).mockResolvedValue({ id: 'req-1' })

      await ClearanceService.approve('req-1', 'officer-user', 'univ-1', 'Documents verified')

      expect(ClearanceRepository.createStageApproval).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'req-1',
        stageId: 'stage-1',
        status: 'APPROVED',
        remarks: 'Documents verified',
      }))
      expect(ClearanceRepository.updateStage).toHaveBeenCalledWith('req-1', 'stage-2', 'IN_PROGRESS')
    })
  })

  describe('reject', () => {
    it('should reject stage, create StageApproval with remarks, and update stageStatus to REJECTED', async () => {
      ;(ClearanceRepository.findById as jest.Mock).mockResolvedValue({
        id: 'req-1',
        studentId: 'student-1',
        currentStageId: 'stage-1',
      })
      ;(OfficersRepository.findByUserId as jest.Mock).mockResolvedValue({
        id: 'officer-1',
        stageAssignments: [{ stageId: 'stage-1' }],
      })
      ;(ClearanceRepository.createStageApproval as jest.Mock).mockResolvedValue({ id: 'appr-1' })
      ;(ClearanceRepository.updateStageStatus as jest.Mock).mockResolvedValue(true)

      await ClearanceService.reject('req-1', 'officer-user', 'univ-1', 'O-Level result is unreadable')

      expect(ClearanceRepository.createStageApproval).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'req-1',
        stageId: 'stage-1',
        status: 'REJECTED',
        remarks: 'O-Level result is unreadable',
      }))
      expect(ClearanceRepository.updateStageStatus).toHaveBeenCalledWith('req-1', 'REJECTED')
    })
  })
})
