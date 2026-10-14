import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StageBuilder } from '../StageBuilder'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { stagesApi } from '@/lib/api/stages.api'

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@/lib/api/stages.api', () => ({
  stagesApi: {
    list: jest.fn(),
    reorder: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('@/lib/api/misc.api', () => ({
  structureApi: {
    faculties: jest.fn().mockResolvedValue({ data: { data: [] } }),
    departments: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
  sessionsApi: {
    list: jest.fn().mockResolvedValue({ data: { data: [] } }),
  },
}))

const mockCampaigns = [
  { id: 'camp-1', name: '2025/2026 Graduating Clearance', isActive: true, eligibilityRules: [] },
]

const mockStages = [
  {
    id: 'stage-1',
    universityId: 'uni-1',
    campaignId: 'camp-1',
    name: 'Library Clearance',
    description: 'Return books',
    orderIndex: 1,
    scope: 'UNIVERSITY',
    isActive: true,
    officerAssignments: [],
    documentRequirements: [],
  },
  {
    id: 'stage-2',
    universityId: 'uni-1',
    campaignId: 'camp-1',
    name: 'Bursary Clearance',
    description: 'Pay dues',
    orderIndex: 2,
    scope: 'UNIVERSITY',
    isActive: true,
    officerAssignments: [],
    documentRequirements: [],
  },
]

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('StageBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(apiClient.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/campaigns') {
        return Promise.resolve({ data: { success: true, data: mockCampaigns } })
      }
      if (url.includes('/officers')) {
        return Promise.resolve({ data: { success: true, data: [] } })
      }
      if (url === '/document-types') {
        return Promise.resolve({ data: { success: true, data: [] } })
      }
      return Promise.resolve({ data: { success: true, data: [] } })
    })
    ;(stagesApi.list as jest.Mock).mockResolvedValue({ data: { success: true, data: mockStages } })
  })

  it('renders stages list with order indexes and stats', async () => {
    renderWithClient(<StageBuilder campaignId="camp-1" />)

    await waitFor(() => {
      expect(screen.getAllByText('Library Clearance').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Bursary Clearance').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Sequence Stages (2)')).toBeInTheDocument()
    expect(screen.getByText('Total Stages')).toBeInTheDocument()
    expect(screen.getByText('Active Stages')).toBeInTheDocument()
  })

  it('opens Add Clearance Stage dialog and submits a new stage', async () => {
    const newStage = {
      id: 'stage-3',
      universityId: 'uni-1',
      campaignId: 'camp-1',
      name: 'Medical Centre',
      orderIndex: 3,
      scope: 'UNIVERSITY',
      isActive: true,
      officerAssignments: [],
      documentRequirements: [],
    }
    ;(stagesApi.create as jest.Mock).mockResolvedValue({ data: { success: true, data: newStage } })

    renderWithClient(<StageBuilder campaignId="camp-1" />)

    await waitFor(() => {
      expect(screen.getAllByText('Library Clearance').length).toBeGreaterThan(0)
    })

    const addBtn = screen.getByRole('button', { name: /add clearance stage/i })
    fireEvent.click(addBtn)

    expect(screen.getByText('Quick Presets')).toBeInTheDocument()

    // Click Medical Centre preset
    const presetBtn = screen.getByRole('button', { name: /^Medical Centre$/i })
    fireEvent.click(presetBtn)

    const submitBtn = screen.getByRole('button', { name: /create stage/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(stagesApi.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Medical Centre',
        campaignId: 'camp-1',
        scope: 'UNIVERSITY',
      }))
    })
  })

  it('opens stage drawer when a stage is clicked', async () => {
    renderWithClient(<StageBuilder campaignId="camp-1" />)

    await waitFor(() => {
      expect(screen.getAllByText('Library Clearance').length).toBeGreaterThan(0)
    })

    const stageElements = screen.getAllByText('Library Clearance')
    const stageCard = stageElements[stageElements.length - 1].closest('div')!
    fireEvent.click(stageCard)

    await waitFor(() => {
      expect(screen.getByText('Stage Details')).toBeInTheDocument()
      expect(screen.getByText('Stage Status')).toBeInTheDocument()
    })
  })
})
