import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StudentDashboard from '../page'
import { useClearanceStatus } from '@/features/clearance/hooks/useClearance'
import { useStages } from '@/features/stages/hooks/useStages'
import { clearanceApi } from '@/lib/api/clearance.api'

jest.mock('@/features/clearance/hooks/useClearance', () => ({
  useClearanceStatus: jest.fn(),
}))

jest.mock('@/features/stages/hooks/useStages', () => ({
  useStages: jest.fn(),
}))

jest.mock('@/lib/api/clearance.api', () => ({
  clearanceApi: {
    downloadCertificatePdf: jest.fn(),
  },
}))

jest.mock('sonner', () => ({
  toast: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockStages = [
  { id: 'stage-1', campaignId: 'camp-1', name: 'Library Clearance', orderIndex: 1, scope: 'UNIVERSITY' },
  { id: 'stage-2', campaignId: 'camp-1', name: 'Bursary Clearance', orderIndex: 2, scope: 'UNIVERSITY' },
]

const mockCompletedClearance = {
  id: 'req-completed',
  universityId: 'univ-1',
  campaignId: 'camp-1',
  sessionId: 'sess-1',
  status: 'COMPLETED',
  stageStatus: 'PENDING',
  clearanceNumber: 'CLR-2026-UNN-999',
  completedAt: new Date().toISOString(),
  session: { id: 'sess-1', name: '2023/2024 Session' },
  campaign: { id: 'camp-1', name: 'Graduation Clearance', issuesCertificate: true },
  student: {
    id: 'stud-1',
    firstName: 'Chukwudi',
    lastName: 'Emeka',
    jambRegNo: '202400123456AB',
    matricNo: '2020/241552',
    department: { id: 'dept-1', name: 'Computer Science' },
  },
  stageApprovals: [
    { id: 'appr-1', stageId: 'stage-1', status: 'APPROVED', decidedAt: new Date().toISOString() },
    { id: 'appr-2', stageId: 'stage-2', status: 'APPROVED', decidedAt: new Date().toISOString() },
  ],
}

describe('StudentDashboard - Task 4.2 Certificate Download', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useStages as jest.Mock).mockReturnValue({
      data: mockStages,
      isLoading: false,
    })
    ;(clearanceApi.downloadCertificatePdf as jest.Mock).mockResolvedValue(true)
  })

  it('renders "Download Clearance Certificate" buttons when clearance is COMPLETED', () => {
    ;(useClearanceStatus as jest.Mock).mockReturnValue({
      data: [mockCompletedClearance],
      isLoading: false,
    })

    render(<StudentDashboard />)

    expect(screen.getByText('Clearance Fully Approved & Verified!')).toBeInTheDocument()
    const downloadBtns = screen.getAllByRole('button', { name: /download clearance certificate/i })
    expect(downloadBtns.length).toBeGreaterThan(0)
  })

  it('calls clearanceApi.downloadCertificatePdf when Download Clearance Certificate is clicked', async () => {
    ;(useClearanceStatus as jest.Mock).mockReturnValue({
      data: [mockCompletedClearance],
      isLoading: false,
    })

    render(<StudentDashboard />)

    const downloadBtns = screen.getAllByRole('button', { name: /download clearance certificate/i })
    fireEvent.click(downloadBtns[0])

    await waitFor(() => {
      expect(clearanceApi.downloadCertificatePdf).toHaveBeenCalledWith(
        'req-completed',
        'Clearance_Certificate_202400123456AB.pdf'
      )
    })
  })

  it('renders upload action when clearance is IN_PROGRESS', () => {
    const mockInProgressClearance = {
      ...mockCompletedClearance,
      status: 'IN_PROGRESS',
      currentStageId: 'stage-1',
      stageStatus: 'PENDING',
      stageApprovals: [],
    }
    ;(useClearanceStatus as jest.Mock).mockReturnValue({
      data: [mockInProgressClearance],
      isLoading: false,
    })

    render(<StudentDashboard />)

    expect(screen.queryByText('Clearance Fully Approved & Verified!')).not.toBeInTheDocument()
    expect(screen.getByText(/Current Action:/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /upload documents/i }).length).toBeGreaterThan(0)
  })
})
