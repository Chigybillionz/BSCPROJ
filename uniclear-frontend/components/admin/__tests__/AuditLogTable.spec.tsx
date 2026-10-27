import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuditLogTable } from '../AuditLogTable'
import { AuditApi } from '@/lib/api/audit.api'

jest.mock('@/lib/api/audit.api', () => ({
  AuditApi: {
    list: jest.fn(),
  },
}))

const mockLogs = [
  {
    id: 'log-1',
    universityId: 'uni-1',
    actorId: 'user-1',
    action: 'STAGE_APPROVED',
    targetId: 'req-12345678',
    targetType: 'ClearanceRequest',
    metadata: { stageId: 'stage-1', remarks: 'Good documentation' },
    ipAddress: '192.168.1.1',
    createdAt: '2026-10-27T10:00:00.000Z',
    actor: { email: 'officer@unn.edu.ng', role: 'OFFICER' },
  },
  {
    id: 'log-2',
    universityId: 'uni-1',
    actorId: 'user-2',
    action: 'DOCUMENT_UPLOADED',
    targetId: 'doc-87654321',
    targetType: 'Document',
    metadata: { documentTypeId: 'doc-type-1' },
    ipAddress: '192.168.1.2',
    createdAt: '2026-10-27T09:30:00.000Z',
    actor: { email: 'student@unn.edu.ng', role: 'STUDENT' },
  },
]

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('AuditLogTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('correctly parses backend array response and renders audit logs and metrics', async () => {
    ;(AuditApi.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: mockLogs,
        pagination: { total: 2, page: 1, limit: 15, pages: 1 },
      },
    })

    renderWithClient(<AuditLogTable />)

    // Wait for data to populate
    await waitFor(() => {
      expect(screen.getByText('officer@unn.edu.ng')).toBeInTheDocument()
      expect(screen.getByText('student@unn.edu.ng')).toBeInTheDocument()
    })

    // Check action badges
    expect(screen.getByText('Stage Approved')).toBeInTheDocument()
    expect(screen.getByText('Document Uploaded')).toBeInTheDocument()

    // Check KPI count
    expect(screen.getByText('Total Recorded Logs')).toBeInTheDocument()
  })

  it('opens metadata inspection modal when View is clicked', async () => {
    ;(AuditApi.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: mockLogs,
        pagination: { total: 2, page: 1, limit: 15, pages: 1 },
      },
    })

    renderWithClient(<AuditLogTable />)

    await waitFor(() => {
      expect(screen.getByText('officer@unn.edu.ng')).toBeInTheDocument()
    })

    const viewButtons = screen.getAllByRole('button', { name: /view/i })
    fireEvent.click(viewButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Event Audit Record')).toBeInTheDocument()
      expect(screen.getByText(/Good documentation/i)).toBeInTheDocument()
    })

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /close record/i }))
    await waitFor(() => {
      expect(screen.queryByText('Event Audit Record')).not.toBeInTheDocument()
    })
  })
})
