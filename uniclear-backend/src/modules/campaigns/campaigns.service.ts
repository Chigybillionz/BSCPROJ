import { CampaignsRepository } from './campaigns.repository'
import { NotFoundError, ValidationError } from '@/core/errors/AppError'

import { StudentsRepository } from '@/modules/students/students.repository'

export class CampaignsService {
  static async list(universityId: string, sessionId?: string) {
    return CampaignsRepository.findAll(universityId, sessionId)
  }

  static async listActive(universityId: string, studentFilter?: { userId: string }) {
    if (studentFilter) {
      const student = await StudentsRepository.findByUserId(studentFilter.userId, universityId)
      if (student) {
        return CampaignsRepository.findActive(universityId, {
          facultyId: student.facultyId || undefined,
          departmentId: student.departmentId || undefined,
          level: student.level || undefined,
          identifiers: [student.jambRegNo, student.matricNo].filter(Boolean) as string[],
        })
      }
    }
    return CampaignsRepository.findActive(universityId)
  }

  static async getById(id: string, universityId: string) {
    const campaign = await CampaignsRepository.findById(id, universityId)
    if (!campaign) throw new NotFoundError('Campaign not found')
    return campaign
  }

  static async create(universityId: string, data: { name: string; description?: string; sessionId: string; eligibilityRules?: { facultyId?: string | null; departmentId?: string | null; level?: string | null }[]; whitelistEnabled?: boolean; whitelist?: string[]; issuesCertificate?: boolean; issuesClearanceSlip?: boolean; issuedDataFields?: string[] }) {
    const { eligibilityRules, ...rest } = data
    return CampaignsRepository.create({
      universityId,
      ...rest,
      eligibilityRules: {
        create: eligibilityRules || []
      }
    })
  }

  static async update(id: string, universityId: string, data: any) {
    await CampaignsService.getById(id, universityId)
    const { eligibilityRules, ...rest } = data
    const updateData: any = { ...rest }
    
    if (eligibilityRules) {
      updateData.eligibilityRules = {
        deleteMany: {},
        create: eligibilityRules
      }
    }
    
    return CampaignsRepository.update(id, updateData)
  }

  static async toggle(id: string, universityId: string) {
    const campaign = await CampaignsService.getById(id, universityId)
    return CampaignsRepository.toggle(id, !campaign.isActive)
  }

  static async delete(id: string, universityId: string) {
    await CampaignsService.getById(id, universityId)
    return CampaignsRepository.delete(id)
  }

  static async uploadCertificateTemplate(id: string, universityId: string, file: Express.Multer.File) {
    const campaign = await CampaignsService.getById(id, universityId)
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowedMimes.includes(file.mimetype)) {
      throw new ValidationError('Invalid certificate template format. Only PDF, PNG, and JPEG are allowed')
    }
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      throw new ValidationError('Certificate template exceeds maximum allowed size (10MB)')
    }

    const { storage } = await import('@/modules/documents/storage')
    const { url } = await storage.upload(file.buffer, `campaigns/${universityId}/${id}/cert-template-${Date.now()}`, file.mimetype)
    
    // We update via repository or db directly
    const { db } = await import('@/lib/db')
    await db.clearanceCampaign.update({
      where: { id: campaign.id },
      data: { customCertificateUrl: url }
    })
    
    return { customCertificateUrl: url }
  }
}
