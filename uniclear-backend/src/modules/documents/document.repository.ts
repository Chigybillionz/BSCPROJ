import { db } from '@/lib/db'

export class DocumentsRepository {
  static async findByRequest(requestId: string, universityId: string) {
    return db.document.findMany({
      where: { requestId, universityId },
      include: { documentType: true },
    })
  }

  static async findByStage(requestId: string, stageId: string, universityId: string) {
    return db.document.findMany({
      where: {
        requestId,
        universityId,
        documentType: { stageRequirements: { some: { stageId } } },
      },
      include: { documentType: true },
    })
  }

  static async findById(id: string, universityId: string) {
    return db.document.findFirst({ where: { id, universityId }, include: { documentType: true, student: true, request: true } })
  }

  static async findExisting(requestId: string, documentTypeId: string) {
    return db.document.findFirst({ where: { requestId, documentTypeId } })
  }

  static async create(data: { universityId: string; studentId: string; requestId: string; documentTypeId: string; fileName: string; fileUrl: string; fileKey: string; fileSizeMB: number; mimeType: string }) {
    return db.document.create({ data })
  }

  static async updateStatus(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
    return db.document.update({
      where: { id },
      data: { status, rejectionReason: status === 'REJECTED' ? rejectionReason : null },
      include: { documentType: true },
    })
  }

  static async delete(id: string) {
    return db.document.delete({ where: { id } })
  }
}
