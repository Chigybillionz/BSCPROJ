import { ClearanceService } from './clearance.service'
import { ClearanceRepository } from './clearance.repository'
import { StagesRepository } from '@/modules/stages/stages.repository'
import { OfficersRepository } from '@/modules/officers/officers.repository'
import { DocumentTypesRepository } from '@/modules/document-types/document-types.repository'
import { DocumentsRepository } from '@/modules/documents/document.repository'
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from '@/core/errors/AppError'
import { db } from '@/lib/db'

import { StudentsRepository } from '@/modules/students/students.repository'

jest.mock('./clearance.repository')
jest.mock('@/modules/stages/stages.repository')
jest.mock('@/modules/officers/officers.repository')
jest.mock('@/modules/document-types/document-types.repository')
jest.mock('@/modules/documents/document.repository')
jest.mock('@/modules/students/students.repository')
jest.mock('@/core/events/EventBus', () => ({ eventBus: { emit: jest.fn() } }))
jest.mock('@/lib/db', () => ({ 
  db: { 
    clearanceStage: { findUnique: jest.fn() }, 
    academicSession: { findFirst: jest.fn() },
    clearanceRequest: { update: jest.fn() },
    student: { findUnique: jest.fn(), findFirst: jest.fn() }
  } 
}))

const mockClearance = {
  id: 'req-id', universityId: 'uni-id', studentId: 'student-user-id',
  sessionId: 'session-id', currentStageId: 'stage-id', status: 'IN_PROGRESS',
  student: { userId: 'student-user-id', id: 'student-id' },
  stageApprovals: [], documents: [],
}

const mockStage = { id: 'stage-id', name: 'Library', orderIndex: 1, isActive: true }
const mockOfficer = { id: 'officer-id', userId: 'officer-user-id', stageAssignments: [{ stageId: 'stage-id' }], universityId: 'uni-id' }

describe('ClearanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(StudentsRepository, 'findByUserId').mockResolvedValue({ id: 'student-id' } as any)
  })

  describe('start', () => {
    it('should throw ConflictError when clearance already in progress', async () => {
      jest.spyOn(ClearanceRepository, 'findActive').mockResolvedValue(mockClearance as any)

      await expect(ClearanceService.start('student-id', 'uni-id', 'session-id', 'campaign-id'))
        .rejects.toThrow(ConflictError)
    })

    it('should throw NotFoundError when no stages configured', async () => {
      jest.spyOn(ClearanceRepository, 'findActive').mockResolvedValue(null)
      jest.spyOn(StagesRepository, 'findFirst').mockResolvedValue(null)

      await expect(ClearanceService.start('student-id', 'uni-id', 'session-id', 'campaign-id'))
        .rejects.toThrow(NotFoundError)
    })

    it('should start clearance successfully', async () => {
      jest.spyOn(ClearanceRepository, 'findActive').mockResolvedValue(null)
      jest.spyOn(StagesRepository, 'findFirst').mockResolvedValue(mockStage as any)
      ;(db.academicSession.findFirst as jest.Mock).mockResolvedValue({ id: 'session-id' })
      jest.spyOn(ClearanceRepository, 'create').mockResolvedValue(mockClearance as any)
      jest.spyOn(ClearanceRepository, 'updateStage').mockResolvedValue(mockClearance as any)

      const result = await ClearanceService.start('student-id', 'uni-id', 'session-id', 'campaign-id')
      expect(result.id).toBe('req-id')
    })
  })

  describe('approve', () => {
    it('should throw ForbiddenError when officer not assigned to this stage', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(OfficersRepository, 'findByUserId').mockResolvedValue({ ...mockOfficer, stageAssignments: [{ stageId: 'different-stage' }] } as any)

      await expect(ClearanceService.approve('req-id', 'officer-user-id', 'uni-id'))
        .rejects.toThrow(ForbiddenError)
    })

    it('should approve and advance to next stage', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(OfficersRepository, 'findByUserId').mockResolvedValue(mockOfficer as any)
      jest.spyOn(ClearanceRepository, 'createStageApproval').mockResolvedValue({} as any)
      ;(db.clearanceStage.findUnique as jest.Mock).mockResolvedValue(mockStage)
      jest.spyOn(StagesRepository, 'findNext').mockResolvedValue({ ...mockStage, id: 'next-stage-id', orderIndex: 2 } as any)
      jest.spyOn(ClearanceRepository, 'updateStage').mockResolvedValue(mockClearance as any)

      const result = await ClearanceService.approve('req-id', 'officer-user-id', 'uni-id', 'Good work')
      expect(result.id).toBe('req-id')
    })

    it('should mark as COMPLETED when last stage approved', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(OfficersRepository, 'findByUserId').mockResolvedValue(mockOfficer as any)
      jest.spyOn(ClearanceRepository, 'createStageApproval').mockResolvedValue({} as any)
      ;(db.clearanceStage.findUnique as jest.Mock).mockResolvedValue(mockStage)
      jest.spyOn(StagesRepository, 'findNext').mockResolvedValue(null) // no next stage
      const spy = jest.spyOn(ClearanceRepository, 'updateStage').mockResolvedValue(mockClearance as any)

      await ClearanceService.approve('req-id', 'officer-user-id', 'uni-id')
      expect(db.clearanceRequest.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'req-id' },
        data: expect.objectContaining({ status: 'COMPLETED', currentStageId: null }),
      }))
    })
  })

  describe('reject', () => {
    it('should throw ForbiddenError when officer not assigned', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(OfficersRepository, 'findByUserId').mockResolvedValue({ ...mockOfficer, stageAssignments: [{ stageId: 'other-stage' }] } as any)

      await expect(ClearanceService.reject('req-id', 'officer-user-id', 'uni-id', 'Bad documents'))
        .rejects.toThrow(ForbiddenError)
    })

    it('should reject stage and record approval', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(OfficersRepository, 'findByUserId').mockResolvedValue(mockOfficer as any)
      const spy = jest.spyOn(ClearanceRepository, 'createStageApproval').mockResolvedValue({} as any)

      await ClearanceService.reject('req-id', 'officer-user-id', 'uni-id', 'Documents not signed')
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: 'REJECTED', remarks: 'Documents not signed' }))
    })
  })

  describe('submit', () => {
    it('should throw ValidationError when required documents are missing', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(DocumentTypesRepository, 'findByStage').mockResolvedValue([
        { isRequired: true, documentTypeId: 'doc-type-id', documentType: { name: 'JAMB Letter' } }
      ] as any)
      jest.spyOn(DocumentsRepository, 'findByStage').mockResolvedValue([])

      await expect(ClearanceService.submit('req-id', 'student-user-id', 'uni-id'))
        .rejects.toThrow(ValidationError)
    })
  })
})
