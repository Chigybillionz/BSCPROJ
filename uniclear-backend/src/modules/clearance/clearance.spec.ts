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
jest.mock('@/lib/db', () => {
  const dbMock: any = { 
    clearanceStage: { 
      findUnique: jest.fn().mockResolvedValue({ id: 'stage-id', orderIndex: 1, isActive: true }),
      findMany: jest.fn().mockResolvedValue([{ id: 'stage-id', orderIndex: 1, isActive: true }]),
      findFirst: jest.fn().mockResolvedValue({ id: 'stage-id', orderIndex: 1, isActive: true }),
    }, 
    clearanceCampaign: { findFirst: jest.fn().mockResolvedValue({ id: 'camp-id', isActive: true, eligibilityRules: [] }) },
    academicSession: { findFirst: jest.fn() },
    student: { findUnique: jest.fn(), findFirst: jest.fn() },
    clearanceRequest: { 
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ currentStageId: 'stage-id', stageStatus: 'SUBMITTED' })
    },
    $transaction: jest.fn(async (fn: any) => fn(dbMock)),
  }
  return { db: dbMock }
})

const mockClearance = {
  id: 'req-id', universityId: 'uni-id', studentId: 'student-user-id',
  sessionId: 'session-id', currentStageId: 'stage-id', status: 'IN_PROGRESS', stageStatus: 'SUBMITTED',
  student: { userId: 'student-user-id', id: 'student-id' },
  stageApprovals: [], documents: [],
}

const mockStage = { id: 'stage-id', name: 'Library', orderIndex: 1, isActive: true }
const mockOfficer = { id: 'officer-id', userId: 'officer-user-id', stageAssignments: [{ stageId: 'stage-id' }], universityId: 'uni-id' }

describe('ClearanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(StudentsRepository, 'findByUserId').mockResolvedValue({ id: 'student-id' } as any)
    jest.spyOn(DocumentTypesRepository, 'findByStage').mockResolvedValue([])
    jest.spyOn(DocumentsRepository, 'findByStage').mockResolvedValue([])
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
      expect(result!.id).toBe('req-id')
    })

    it('should mark as COMPLETED when last stage approved', async () => {
      jest.spyOn(ClearanceRepository, 'findById').mockResolvedValue(mockClearance as any)
      jest.spyOn(OfficersRepository, 'findByUserId').mockResolvedValue(mockOfficer as any)
      jest.spyOn(ClearanceRepository, 'createStageApproval').mockResolvedValue({} as any)
      ;(db.clearanceStage.findUnique as jest.Mock).mockResolvedValue(mockStage)
      jest.spyOn(StagesRepository, 'findNext').mockResolvedValue(null) // no next stage
      const spy = jest.spyOn(ClearanceRepository, 'updateStage').mockResolvedValue(mockClearance as any)

      await ClearanceService.approve('req-id', 'officer-user-id', 'uni-id')
      expect(db.clearanceRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'req-id' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        })
      )
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

  describe('verify', () => {
    it('should throw ValidationError if clearanceNumber is missing', async () => {
      await expect(ClearanceService.verify(''))
        .rejects.toThrow(ValidationError)
    })

    it('should throw NotFoundError if clearance record is not found or not completed', async () => {
      ;(db.clearanceRequest.findUnique as jest.Mock).mockResolvedValue(null)
      await expect(ClearanceService.verify('CLR-2026-INVALID'))
        .rejects.toThrow(NotFoundError)
    })

    it('should return verification payload for completed clearance', async () => {
      const mockCompletedClearance = {
        id: 'clr-123',
        clearanceNumber: 'CLR-2026-TEST-1234',
        status: 'COMPLETED',
        completedAt: new Date('2026-05-10T10:00:00Z'),
        student: {
          firstName: 'Emeka',
          lastName: 'Nwankwo',
          jambRegNo: '2024778899EN',
          matricNo: '2020/245678',
          faculty: { id: 'f-1', name: 'Physical Sciences' },
          department: { id: 'd-1', name: 'Computer Science' },
        },
        session: { id: 's-1', name: '2024/2025' },
        campaign: { id: 'c-1', name: 'Final Year Clearance', issuesCertificate: true, issuesClearanceSlip: true },
        university: { id: 'u-1', name: 'University of Nigeria', slug: 'unn', logoUrl: '/logo.png', primaryColor: '#006633' },
        stageApprovals: [
          { stage: { id: 'st-1', name: 'Library', orderIndex: 1 }, decidedAt: new Date('2026-05-01') },
          { stage: { id: 'st-2', name: 'Bursary', orderIndex: 2 }, decidedAt: new Date('2026-05-05') },
        ],
        issuedData: { 'Graduation Year': '2026' },
      }

      ;(db.clearanceRequest.findUnique as jest.Mock).mockResolvedValue(mockCompletedClearance)

      const result = await ClearanceService.verify('CLR-2026-TEST-1234')
      expect(result.isValid).toBe(true)
      expect(result.clearanceNumber).toBe('CLR-2026-TEST-1234')
      expect(result.student.fullName).toBe('Emeka Nwankwo')
      expect(result.student.faculty).toBe('Physical Sciences')
      expect(result.university.name).toBe('University of Nigeria')
      expect(result.stages).toHaveLength(2)
      expect(result.stages[0].stageName).toBe('Library')
    })
  })
})
