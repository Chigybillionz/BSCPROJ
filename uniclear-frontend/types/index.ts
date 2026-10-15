import type { Role } from '@/lib/constants'

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
}

export interface ApiError {
  success: false
  message: string
  code?: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export interface PaginatedResponse<T> {
  success: true
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  role: Role
  universityId: string | null
  student?: { firstName: string; lastName: string } | null
  officer?: { firstName: string; lastName: string } | null
}

// ─── University / Tenant ──────────────────────────────────────────────────────

export interface UniversityBranding {
  loginBgUrl: string | null
  bannerMessage: string | null
  footerText: string | null
}

export interface University {
  id: string
  name: string
  slug: string
  primaryColor: string
  accentColor: string
  logoUrl: string | null
  branding: UniversityBranding | null
}

// ─── Clearance ────────────────────────────────────────────────────────────────

export type ClearanceStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

export interface ClearanceCampaign {
  id: string
  name: string
  description: string | null
  isActive: boolean
  eligibilityRules: {
    id: string
    facultyId: string | null
    departmentId: string | null
    level: string | null
  }[]
  whitelistEnabled: boolean
  whitelist: string[]
  issuesCertificate: boolean
  issuesClearanceSlip: boolean
  issuedDataFields: string[]
  customCertificateUrl: string | null
  customCertificateCoords: any | null
  createdAt: string
  updatedAt: string
  sessionId: string
  session?: {
    id: string
    name: string
    isActive: boolean
  }
}

export interface ClearanceStage {
  id: string
  name: string
  description?: string | null
  scope?: 'UNIVERSITY' | 'FACULTY' | 'DEPARTMENT'
  campaignId: string
  orderIndex: number
  isActive: boolean
  documentRequirements: {
    id: string
    documentTypeId: string
    isRequired: boolean
    documentType: {
      id: string
      name: string
      allowedFormats?: string[]
      maxFileSizeMB?: number
    }
  }[]
  officerAssignments?: {
    id: string
    officerId: string
    officer: { id: string; firstName: string; lastName: string }
    faculty?: { id: string; name: string } | null
    department?: { id: string; name: string } | null
    session?: { id: string; name: string } | null
  }[]
}

export interface StageApproval {
  id: string
  stageId: string
  status: ClearanceStatus
  remarks: string | null
  attachmentUrl?: string | null
  createdAt: string
}

export interface ClearanceRequest {
  id: string
  studentId: string
  universityId: string
  sessionId: string
  session?: { id: string; name: string } | null
  campaignId: string
  campaign?: ClearanceCampaign | null
  status: ClearanceStatus
  stageStatus: 'PENDING' | 'SUBMITTED' | 'REJECTED'
  currentStageId: string | null
  currentStage?: {
    name: string
    documentRequirements?: {
      id: string
      documentTypeId: string
      isRequired: boolean
      documentType: {
        id: string
        name: string
        allowedFormats?: string[]
        maxFileSizeMB?: number
      }
    }[]
  } | null
  student?: { firstName: string; lastName: string; matricNo: string | null; jambRegNo: string; department?: { name: string } | null; faculty?: { name: string } | null } | null
  completedAt?: string | null
  clearanceNumber: string | null
  issuedData: any | null
  updatedAt: string
  stageApprovals: StageApproval[]
  documents: Document[]
  createdAt: string
}

// ─── Documents ────────────────────────────────────────────────────────────────

export interface DocumentType {
  id: string
  name: string
  description: string | null
  isRequired: boolean
  isActive: boolean
  allowedFormats: string[]
  maxFileSizeMB: number
}

export interface Document {
  id: string
  documentTypeId: string
  documentType: DocumentType
  fileName: string
  fileUrl: string
  fileKey: string
  fileSizeMB: number
  mimeType: string
  status: ClearanceStatus
  rejectionReason?: string | null
  uploadedAt: string
}

export interface Faculty {
  id: string
  name: string
  universityId?: string
  departments?: Department[]
}

export interface Department {
  id: string
  name: string
  facultyId: string
  availableLevels?: string[]
}

// ─── Student ──────────────────────────────────────────────────────────────────

export interface Student {
  id: string
  userId: string | null
  user?: { email: string }
  jambRegNo: string
  matricNo: string | null
  firstName: string
  lastName: string
  department?: { id: string, name: string } | null
  faculty?: { id: string, name: string } | null
  universityId: string
  entrySessionId?: string | null
}

// ─── Officer ─────────────────────────────────────────────────────────────────

export interface Officer {
  id: string
  userId: string
  fullName: string
  email: string
  stageId: string | null
  stage: ClearanceStage | null
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  universityId: string
  actorId: string
  action: string
  targetId: string | null
  targetType: string | null
  metadata: any
  ipAddress: string | null
  createdAt: string
  actor: {
    email: string
    role: string
  }
}
