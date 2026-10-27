import path from 'path'
import { DocumentsRepository } from './document.repository'
import { storage } from './storage'
import { eventBus } from '@/core/events/EventBus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/core/errors/AppError'
import { db } from '@/lib/db'

export class DocumentsService {
  static async getByRequest(requestId: string, universityId: string, userId?: string, role?: string) {
    if (role === 'STUDENT') {
      const clearance = await db.clearanceRequest.findUnique({
        where: { id: requestId },
        include: { student: true }
      })
      if (!clearance || clearance.student.userId !== userId) {
        throw new ForbiddenError('You do not have permission to view these documents')
      }
    }
    const docs = await DocumentsRepository.findByRequest(requestId, universityId)
    return Promise.all(
      docs.map(async doc => {
        try {
          if (doc.fileKey) {
            const freshUrl = await storage.getSignedUrl(doc.fileKey)
            if (freshUrl) return { ...doc, fileUrl: freshUrl }
          }
        } catch {
          // If storage refresh fails, keep existing fileUrl as fallback
        }
        return doc
      })
    )
  }

  static async getByStage(requestId: string, stageId: string, universityId: string) {
    const docs = await DocumentsRepository.findByStage(requestId, stageId, universityId)
    return Promise.all(
      docs.map(async doc => {
        try {
          if (doc.fileKey) {
            const freshUrl = await storage.getSignedUrl(doc.fileKey)
            if (freshUrl) return { ...doc, fileUrl: freshUrl }
          }
        } catch {}
        return doc
      })
    )
  }

  static async upload(universityId: string, studentId: string, requestId: string, documentTypeId: string, file: Express.Multer.File) {
    const docType = await db.documentType.findFirst({ where: { id: documentTypeId, universityId } })
    if (!docType) throw new NotFoundError('Document type not found')

    // Sanitize originalname — strip directory components, keep only bare filename
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')
    const rawExt = path.extname(safeName).replace('.', '').toLowerCase()
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt

    const normalizedAllowed = docType.allowedFormats.map(f => f.toLowerCase() === 'jpeg' ? 'jpg' : f.toLowerCase())
    if (!ext || !normalizedAllowed.includes(ext)) {
      throw new ValidationError(`Invalid format. Allowed: ${docType.allowedFormats.join(', ')}`)
    }

    // Validate MIME type matches extension
    const allowedMimes: Record<string, string[]> = {
      pdf:  ['application/pdf'],
      jpg:  ['image/jpeg', 'image/pjpeg'],
      png:  ['image/png'],
    }
    if (allowedMimes[ext] && !allowedMimes[ext].includes(file.mimetype)) {
      throw new ValidationError('File MIME type does not match extension')
    }

    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > docType.maxFileSizeMB) {
      throw new ValidationError(`File too large. Max: ${docType.maxFileSizeMB}MB`)
    }

    // Remove existing upload for same doc type in same request
    const existing = await DocumentsRepository.findExisting(requestId, documentTypeId)
    if (existing) {
      if (existing.status === 'APPROVED') {
        throw new ValidationError('This document has already been verified and approved by an officer and cannot be replaced.')
      }
      await storage.delete(existing.fileKey)
      await DocumentsRepository.delete(existing.id)
    }

    // filePath uses UUID-based key — safeName is only stored for display
    const filePath = `${universityId}/${studentId}/${Date.now()}-${safeName}`
    const { url, key } = await storage.upload(file.buffer, filePath, file.mimetype)

    const document = await DocumentsRepository.create({
      universityId, studentId, requestId, documentTypeId,
      fileName: safeName, fileUrl: url, fileKey: key,
      fileSizeMB, mimeType: file.mimetype,
    })

    // Touch clearance request updatedAt so officers queue reflects fresh uploads
    const clearance = await db.clearanceRequest.findUnique({
      where: { id: requestId },
      include: {
        currentStage: {
          include: {
            documentRequirements: true,
          },
        },
        documents: true,
      },
    })

    if (clearance && clearance.currentStageId) {
      const stageRequirements = clearance.currentStage?.documentRequirements || []
      const requiredTypeIds = stageRequirements.filter(r => r.isRequired).map(r => r.documentTypeId)
      
      // All existing valid (not rejected) documents for this request
      const validDocTypeIds = new Set(
        clearance.documents
          .filter(d => d.status !== 'REJECTED' || d.documentTypeId === documentTypeId) // current document was just created/updated with PENDING
          .map(d => d.documentTypeId)
      )
      validDocTypeIds.add(documentTypeId)

      const allRequirementsMet = requiredTypeIds.every(id => validDocTypeIds.has(id))

      // If student was REJECTED and has now uploaded all required documents, auto-submit for review
      if (allRequirementsMet && clearance.stageStatus === 'REJECTED') {
        await db.clearanceRequest.update({
          where: { id: requestId },
          data: { updatedAt: new Date(), stageStatus: 'SUBMITTED' },
        }).catch(() => {})
        eventBus.emit('stage.submitted', { requestId, stageId: clearance.currentStageId, studentId, universityId })
      } else {
        await db.clearanceRequest.update({
          where: { id: requestId },
          data: { updatedAt: new Date() },
        }).catch(() => {})
      }
    } else {
      await db.clearanceRequest.update({
        where: { id: requestId },
        data: { updatedAt: new Date() },
      }).catch(() => {})
    }

    eventBus.emit('document.uploaded', { documentId: document.id, studentId, universityId })
    return document
  }

  static async delete(id: string, universityId: string, userId?: string, role?: string) {
    const doc = await DocumentsRepository.findById(id, universityId)
    if (!doc) throw new NotFoundError('Document not found')

    if (role === 'STUDENT' && (doc as any).student?.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this document')
    }

    if (doc.status === 'APPROVED') {
      throw new ValidationError('Cannot delete an already approved document')
    }

    if ((doc as any).request?.status === 'COMPLETED') {
      throw new ValidationError('Cannot delete documents from a completed clearance')
    }

    await storage.delete(doc.fileKey)
    return DocumentsRepository.delete(id)
  }

  static async approveDocument(id: string, universityId: string) {
    const doc = await DocumentsRepository.findById(id, universityId)
    if (!doc) throw new NotFoundError('Document not found')
    return DocumentsRepository.updateStatus(id, 'APPROVED')
  }

  static async rejectDocument(id: string, universityId: string, reason: string) {
    if (!reason?.trim()) throw new ValidationError('Rejection reason is required')
    const doc = await DocumentsRepository.findById(id, universityId)
    if (!doc) throw new NotFoundError('Document not found')
    // When an officer rejects a doc, reset it so the student can re-upload
    return DocumentsRepository.updateStatus(id, 'REJECTED', reason.trim())
  }

  static async getSignedUrl(id: string, universityId: string, userId?: string, role?: string) {
    const doc = await DocumentsRepository.findById(id, universityId)
    if (!doc) throw new NotFoundError('Document not found')

    if (role === 'STUDENT' && (doc as any).student?.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this document')
    }

    return storage.getSignedUrl(doc.fileKey)
  }
}
