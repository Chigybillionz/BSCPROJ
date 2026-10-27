import { DocumentsService } from './document.service'
import { DocumentsRepository } from './document.repository'
import { storage } from './storage'
import { NotFoundError, ValidationError } from '@/core/errors/AppError'
import { db } from '@/lib/db'

jest.mock('./document.repository')
jest.mock('./storage', () => ({
  storage: {
    upload: jest.fn(),
    delete: jest.fn(),
    getSignedUrl: jest.fn(),
  },
}))
jest.mock('@/lib/db', () => ({
  db: {
    documentType: { findFirst: jest.fn() },
    clearanceRequest: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) },
  },
}))
jest.mock('@/core/events/EventBus', () => ({
  eventBus: { emit: jest.fn() },
}))

describe('DocumentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('upload', () => {
    const mockDocType = {
      id: 'dt-1',
      universityId: 'uni-1',
      name: 'JAMB Admission Letter',
      allowedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMB: 5,
    }

    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'admission_letter.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024 * 1024, // 1MB
      buffer: Buffer.from('fake pdf data'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    }

    it('should successfully upload a document and save metadata', async () => {
      ;(db.documentType.findFirst as jest.Mock).mockResolvedValue(mockDocType)
      ;(DocumentsRepository.findExisting as jest.Mock).mockResolvedValue(null)
      ;(storage.upload as jest.Mock).mockResolvedValue({
        url: 'http://localhost:5001/uploads/test.pdf',
        key: 'test.pdf',
      })
      ;(DocumentsRepository.create as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        universityId: 'uni-1',
        studentId: 'stud-1',
        requestId: 'req-1',
        documentTypeId: 'dt-1',
        fileName: 'admission_letter.pdf',
        fileUrl: 'http://localhost:5001/uploads/test.pdf',
        fileKey: 'test.pdf',
        fileSizeMB: 1,
        mimeType: 'application/pdf',
        status: 'PENDING',
      })

      const doc = await DocumentsService.upload(
        'uni-1',
        'stud-1',
        'req-1',
        'dt-1',
        mockFile
      )

      expect(doc.id).toBe('doc-1')
      expect(doc.fileName).toBe('admission_letter.pdf')
      expect(storage.upload).toHaveBeenCalled()
      expect(DocumentsRepository.create).toHaveBeenCalled()
    })

    it('should throw NotFoundError if document type does not exist', async () => {
      ;(db.documentType.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(
        DocumentsService.upload('uni-1', 'stud-1', 'req-1', 'bad-type', mockFile)
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw ValidationError if file format is not allowed', async () => {
      ;(db.documentType.findFirst as jest.Mock).mockResolvedValue(mockDocType)
      const invalidFile = { ...mockFile, originalname: 'script.exe' }

      await expect(
        DocumentsService.upload('uni-1', 'stud-1', 'req-1', 'dt-1', invalidFile)
      ).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError if MIME type does not match extension', async () => {
      ;(db.documentType.findFirst as jest.Mock).mockResolvedValue(mockDocType)
      const mismatchedFile = { ...mockFile, originalname: 'doc.pdf', mimetype: 'text/plain' }

      await expect(
        DocumentsService.upload('uni-1', 'stud-1', 'req-1', 'dt-1', mismatchedFile)
      ).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError if file size exceeds maximum allowed size', async () => {
      ;(db.documentType.findFirst as jest.Mock).mockResolvedValue(mockDocType)
      const oversizedFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB > 5MB limit
      }

      await expect(
        DocumentsService.upload('uni-1', 'stud-1', 'req-1', 'dt-1', oversizedFile)
      ).rejects.toThrow(ValidationError)
    })

    it('should remove existing document and storage file when re-uploading', async () => {
      ;(db.documentType.findFirst as jest.Mock).mockResolvedValue(mockDocType)
      ;(DocumentsRepository.findExisting as jest.Mock).mockResolvedValue({
        id: 'old-doc-1',
        fileKey: 'old-file-key.pdf',
      })
      ;(storage.upload as jest.Mock).mockResolvedValue({
        url: 'http://localhost:5001/uploads/new.pdf',
        key: 'new.pdf',
      })
      ;(DocumentsRepository.create as jest.Mock).mockResolvedValue({
        id: 'new-doc-1',
      })

      await DocumentsService.upload('uni-1', 'stud-1', 'req-1', 'dt-1', mockFile)

      expect(storage.delete).toHaveBeenCalledWith('old-file-key.pdf')
      expect(DocumentsRepository.delete).toHaveBeenCalledWith('old-doc-1')
    })
  })

  describe('delete', () => {
    it('should delete document and remove file from storage', async () => {
      ;(DocumentsRepository.findById as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        fileKey: 'file-1.pdf',
      })
      ;(DocumentsRepository.delete as jest.Mock).mockResolvedValue({ id: 'doc-1' })

      await DocumentsService.delete('doc-1', 'uni-1')

      expect(storage.delete).toHaveBeenCalledWith('file-1.pdf')
      expect(DocumentsRepository.delete).toHaveBeenCalledWith('doc-1')
    })

    it('should throw NotFoundError if document to delete does not exist', async () => {
      ;(DocumentsRepository.findById as jest.Mock).mockResolvedValue(null)

      await expect(DocumentsService.delete('missing-doc', 'uni-1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('approveDocument and rejectDocument', () => {
    it('should approve document successfully', async () => {
      ;(DocumentsRepository.findById as jest.Mock).mockResolvedValue({ id: 'doc-1' })
      ;(DocumentsRepository.updateStatus as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'APPROVED',
      })

      const res = await DocumentsService.approveDocument('doc-1', 'uni-1')
      expect(res.status).toBe('APPROVED')
    })

    it('should reject document with reason', async () => {
      ;(DocumentsRepository.findById as jest.Mock).mockResolvedValue({ id: 'doc-1' })
      ;(DocumentsRepository.updateStatus as jest.Mock).mockResolvedValue({
        id: 'doc-1',
        status: 'REJECTED',
        rejectionReason: 'Blurry document scan',
      })

      const res = await DocumentsService.rejectDocument('doc-1', 'uni-1', 'Blurry document scan')
      expect(res.status).toBe('REJECTED')
      expect(DocumentsRepository.updateStatus).toHaveBeenCalledWith('doc-1', 'REJECTED', 'Blurry document scan')
    })

    it('should throw ValidationError if rejection reason is empty', async () => {
      await expect(
        DocumentsService.rejectDocument('doc-1', 'uni-1', '   ')
      ).rejects.toThrow(ValidationError)
    })
  })
})
