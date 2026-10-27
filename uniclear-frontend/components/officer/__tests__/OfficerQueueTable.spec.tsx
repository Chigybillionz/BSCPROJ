import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OfficerQueueTable, OfficerQueueItem } from '../OfficerQueueTable'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockItems: OfficerQueueItem[] = [
  {
    id: 'req-1',
    status: 'IN_PROGRESS',
    stageStatus: 'SUBMITTED',
    currentStageId: 'stage-dept',
    createdAt: '2026-10-12T09:30:00.000Z',
    updatedAt: '2026-10-12T09:30:00.000Z',
    student: {
      id: 'stud-1',
      firstName: 'Emeka',
      lastName: 'Nwankwo',
      jambRegNo: '202412345678AB',
      level: '100',
      faculty: { id: 'fac-1', name: 'Physical Sciences' },
      department: { id: 'dept-1', name: 'Computer Science' },
    },
    currentStage: {
      id: 'stage-dept',
      name: 'Department Clearance',
      orderIndex: 1,
    },
    documents: [
      { id: 'doc-1', documentType: { name: 'O-Level' } },
      { id: 'doc-2', documentType: { name: 'JAMB Result' } },
    ],
  },
  {
    id: 'req-2',
    status: 'IN_PROGRESS',
    stageStatus: 'SUBMITTED',
    currentStageId: 'stage-dept',
    createdAt: '2026-10-12T10:15:00.000Z',
    updatedAt: '2026-10-12T10:15:00.000Z',
    student: {
      id: 'stud-2',
      firstName: 'Chidinma',
      lastName: 'Okafor',
      jambRegNo: '202487654321XY',
      level: '100',
      faculty: { id: 'fac-1', name: 'Physical Sciences' },
      department: { id: 'dept-2', name: 'Mathematics' },
    },
    currentStage: {
      id: 'stage-dept',
      name: 'Department Clearance',
      orderIndex: 1,
    },
    documents: [],
  },
]

describe('OfficerQueueTable', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders table columns correctly: Student Name, Reg Number, Department, and Date Submitted', () => {
    render(<OfficerQueueTable items={mockItems} total={2} />)

    // Check table headers
    expect(screen.getByText('Student Name')).toBeInTheDocument()
    expect(screen.getByText('Reg Number')).toBeInTheDocument()
    expect(screen.getByText('Department')).toBeInTheDocument()
    expect(screen.getByText('Date Submitted')).toBeInTheDocument()

    // Check row data
    expect(screen.getByText('Emeka Nwankwo')).toBeInTheDocument()
    expect(screen.getByText('202412345678AB')).toBeInTheDocument()
    expect(screen.getAllByText('Computer Science').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Chidinma Okafor')).toBeInTheDocument()
    expect(screen.getByText('202487654321XY')).toBeInTheDocument()
    expect(screen.getAllByText('Mathematics').length).toBeGreaterThanOrEqual(1)
  })

  it('navigates to review page when Review button is clicked', () => {
    render(<OfficerQueueTable items={mockItems} total={2} />)

    const reviewButtons = screen.getAllByRole('button', { name: /review/i })
    expect(reviewButtons).toHaveLength(2)

    fireEvent.click(reviewButtons[0])
    expect(mockPush).toHaveBeenCalledWith('/officer/review/req-1')
  })

  it('filters items by department dropdown', async () => {
    render(<OfficerQueueTable items={mockItems} total={2} />)

    expect(screen.getByText('Emeka Nwankwo')).toBeInTheDocument()
    expect(screen.getByText('Chidinma Okafor')).toBeInTheDocument()

    const dropdownTrigger = screen.getByText(/All Departments/i)
    fireEvent.click(dropdownTrigger)

    const csElements = screen.getAllByText('Computer Science')
    const csOption = csElements.find(el => el.tagName === 'P') || csElements[0]
    fireEvent.click(csOption)

    await waitFor(() => {
      expect(screen.getByText('Emeka Nwankwo')).toBeInTheDocument()
      expect(screen.queryByText('Chidinma Okafor')).not.toBeInTheDocument()
    })
  })

  it('calls onSearchChange when search form is submitted', () => {
    const handleSearchChange = jest.fn()
    render(
      <OfficerQueueTable
        items={mockItems}
        total={2}
        onSearchChange={handleSearchChange}
      />
    )

    const input = screen.getByPlaceholderText(/search by name or jamb reg no/i)
    fireEvent.change(input, { target: { value: 'Emeka' } })

    const searchBtn = screen.getByRole('button', { name: /search/i })
    fireEvent.click(searchBtn)

    expect(handleSearchChange).toHaveBeenCalledWith('Emeka')
  })

  it('renders empty state when no items are present', () => {
    render(<OfficerQueueTable items={[]} total={0} />)

    expect(screen.getByText('All Caught Up!')).toBeInTheDocument()
  })
})
