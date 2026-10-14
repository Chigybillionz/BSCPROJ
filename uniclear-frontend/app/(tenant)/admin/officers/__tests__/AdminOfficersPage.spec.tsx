import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminOfficersPage from '../page'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { officersApi } from '@/lib/api/officers.api'
import { stagesApi } from '@/lib/api/stages.api'

jest.mock('@/lib/api/officers.api', () => ({
  officersApi: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    assign: jest.fn(),
    unassign: jest.fn(),
  },
}))

jest.mock('@/lib/api/stages.api', () => ({
  stagesApi: {
    list: jest.fn(),
  },
}))

jest.mock('@/lib/api/misc.api', () => ({
  structureApi: {
    faculties: jest.fn().mockResolvedValue({ data: { data: [] } }),
    departments: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
}))

const mockStages = [
  { id: 'stage-lib', name: 'Library Clearance', orderIndex: 1, scope: 'UNIVERSITY' },
  { id: 'stage-bur', name: 'Bursary Clearance', orderIndex: 2, scope: 'UNIVERSITY' },
]

const mockOfficers = [
  {
    id: 'officer-1',
    firstName: 'Emeka',
    lastName: 'Nwosu',
    user: { id: 'u1', email: 'emeka@unn.edu.ng', role: 'OFFICER', isActive: true },
    stageAssignments: [
      { id: 'asgn-1', stageId: 'stage-lib', stage: { id: 'stage-lib', name: 'Library Clearance' } }
    ],
  },
  {
    id: 'officer-2',
    firstName: 'Ngozi',
    lastName: 'Okeke',
    user: { id: 'u2', email: 'ngozi@unn.edu.ng', role: 'ADMIN', isActive: true },
    stageAssignments: [],
  },
]

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('AdminOfficersPage (User & Role Management)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(officersApi.list as jest.Mock).mockResolvedValue({
      data: {
        data: mockOfficers,
        pagination: { total: 2, page: 1, limit: 100 },
      },
    })
    ;(stagesApi.list as jest.Mock).mockResolvedValue({
      data: { success: true, data: mockStages },
    })
  })

  it('renders user management table with roles, status, and stage assignments', async () => {
    renderWithClient(<AdminOfficersPage />)

    await waitFor(() => {
      expect(screen.getByText('Emeka Nwosu')).toBeInTheDocument()
      expect(screen.getByText('Ngozi Okeke')).toBeInTheDocument()
    })

    expect(screen.getByText('Total Registered Staff')).toBeInTheDocument()
    expect(screen.getByText('Stage Assigned')).toBeInTheDocument()
    expect(screen.getAllByText('Library Clearance').length).toBeGreaterThan(0)
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('allows registering an officer and assigning them to Library stage', async () => {
    ;(officersApi.create as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: 'officer-3',
          firstName: 'Chidi',
          lastName: 'Mba',
          user: { email: 'chidi@unn.edu.ng', role: 'OFFICER' },
          inviteLink: 'http://localhost:3000/set-password?token=test',
          tempPassword: 'pass',
        },
      },
    })

    renderWithClient(<AdminOfficersPage />)

    await waitFor(() => {
      expect(screen.getByText('Emeka Nwosu')).toBeInTheDocument()
    })

    const addBtn = screen.getByRole('button', { name: /\+ Add User \/ Officer/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Register User & Assign Clearance Stage')).toBeInTheDocument()

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('e.g. Samuel'), { target: { value: 'Chidi' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. Eze'), { target: { value: 'Mba' } })
    fireEvent.change(screen.getByPlaceholderText('e.g. samuel.eze@unn.edu.ng'), { target: { value: 'chidi@unn.edu.ng' } })

    // Select Library Clearance stage from dropdown
    const stageSelect = screen.getByLabelText(/Assign Clearance Stage/i)
    fireEvent.change(stageSelect, { target: { value: 'stage-lib' } })

    const submitBtn = screen.getByRole('button', { name: /Create User & Assign Stage/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(officersApi.create).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Chidi',
        lastName: 'Mba',
        email: 'chidi@unn.edu.ng',
        role: 'OFFICER',
        stageId: 'stage-lib',
      }))
    })
  })

  it('allows assigning a clearance stage to an unassigned user', async () => {
    ;(officersApi.assign as jest.Mock).mockResolvedValue({
      data: { success: true, data: { id: 'asgn-new' } },
    })

    renderWithClient(<AdminOfficersPage />)

    await waitFor(() => {
      expect(screen.getByText('Ngozi Okeke')).toBeInTheDocument()
    })

    // Click assign button for second officer
    const assignButtons = screen.getAllByRole('button', { name: /\+ Assign Stage/i })
    fireEvent.click(assignButtons[1])

    expect(screen.getByText(/Assign Stage to Ngozi Okeke/i)).toBeInTheDocument()

    const stageSelect = screen.getByLabelText(/Select Clearance Stage/i)
    fireEvent.change(stageSelect, { target: { value: 'stage-lib' } })

    const confirmBtn = screen.getByRole('button', { name: /Confirm Assignment/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(officersApi.assign).toHaveBeenCalledWith('stage-lib', expect.objectContaining({
        officerId: 'officer-2',
      }))
    })
  })
})
