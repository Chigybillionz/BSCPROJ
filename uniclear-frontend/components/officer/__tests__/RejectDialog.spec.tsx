import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { RejectDialog } from '../RejectDialog'

describe('RejectDialog', () => {
  const mockOnConfirm = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal with title, instructions, and textarea', () => {
    render(<RejectDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

    expect(screen.getByText('Reject Stage')).toBeInTheDocument()
    expect(screen.getByText(/provide a clear reason so the student knows what to fix/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/explain the rejection reason in detail/i)).toBeInTheDocument()
  })

  it('disables Confirm button and displays warning if remarks are fewer than 10 characters', () => {
    render(<RejectDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

    const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i })
    expect(confirmBtn).toBeDisabled()

    const textarea = screen.getByRole('textbox', { name: /rejection reason/i })
    fireEvent.change(textarea, { target: { value: 'Too short' } }) // 9 chars

    expect(screen.getByText(/please provide at least 10 characters/i)).toBeInTheDocument()
    expect(confirmBtn).toBeDisabled()
  })

  it('enables Confirm button and calls onConfirm when valid remarks (>= 10 chars) are entered', () => {
    render(<RejectDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

    const textarea = screen.getByRole('textbox', { name: /rejection reason/i })
    fireEvent.change(textarea, { target: { value: 'The uploaded O-Level statement of result is blurred and unreadable.' } })

    const confirmBtn = screen.getByRole('button', { name: /confirm rejection/i })
    expect(confirmBtn).toBeEnabled()

    fireEvent.click(confirmBtn)
    expect(mockOnConfirm).toHaveBeenCalledWith(
      'The uploaded O-Level statement of result is blurred and unreadable.'
    )
  })

  it('calls onCancel when Cancel button is clicked', () => {
    render(<RejectDialog onConfirm={mockOnConfirm} onCancel={mockOnCancel} />)

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
})
