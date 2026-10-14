import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StampManagerDialog } from '../StampManagerDialog'
import { officerStampsApi, OfficerStamp } from '@/lib/api/officerStamps.api'

jest.mock('@/lib/api/officerStamps.api', () => ({
  officerStampsApi: {
    upload: jest.fn(),
    delete: jest.fn(),
  },
}))

const mockStamps: OfficerStamp[] = [
  {
    id: 'stamp-1',
    name: 'HOD Seal',
    imageUrl: 'http://localhost:5001/uploads/stamp1.png',
    createdAt: '2026-10-12T00:00:00.000Z',
  },
]

describe('StampManagerDialog', () => {
  const mockOnStampsChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders trigger button and opens modal when clicked', () => {
    render(<StampManagerDialog stamps={mockStamps} onStampsChange={mockOnStampsChange} />)

    const triggerBtn = screen.getByRole('button', { name: /manage signatures & stamps/i })
    expect(triggerBtn).toBeInTheDocument()

    fireEvent.click(triggerBtn)

    expect(screen.getByText('Signatures & Stamps')).toBeInTheDocument()
    expect(screen.getByText('HOD Seal')).toBeInTheDocument()
  })

  it('allows uploading a new stamp image', async () => {
    const newStamp: OfficerStamp = {
      id: 'stamp-2',
      name: 'Faculty Officer Stamp',
      imageUrl: 'http://localhost:5001/uploads/stamp2.png',
      createdAt: '2026-10-12T00:00:00.000Z',
    }
    ;(officerStampsApi.upload as jest.Mock).mockResolvedValue({ data: { data: newStamp } })

    render(<StampManagerDialog stamps={mockStamps} onStampsChange={mockOnStampsChange} />)

    fireEvent.click(screen.getByRole('button', { name: /manage signatures & stamps/i }))

    const nameInput = screen.getByPlaceholderText(/e\.g\. Official Stamp/i)
    fireEvent.change(nameInput, { target: { value: 'Faculty Officer Stamp' } })

    const file = new File(['dummy-content'], 'stamp.png', { type: 'image/png' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [file] } })

    const form = fileInput.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(officerStampsApi.upload).toHaveBeenCalledWith('Faculty Officer Stamp', file)
      expect(mockOnStampsChange).toHaveBeenCalledWith([...mockStamps, newStamp])
    })
  })

  it('deletes an existing stamp when delete button is clicked', async () => {
    ;(officerStampsApi.delete as jest.Mock).mockResolvedValue({ data: { success: true } })

    render(<StampManagerDialog stamps={mockStamps} onStampsChange={mockOnStampsChange} />)

    fireEvent.click(screen.getByRole('button', { name: /manage signatures & stamps/i }))

    const deleteBtn = screen.getByTitle(/delete stamp/i)
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(officerStampsApi.delete).toHaveBeenCalledWith('stamp-1')
      expect(mockOnStampsChange).toHaveBeenCalledWith([])
    })
  })
})
