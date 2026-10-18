import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../input'

describe('Input', () => {
  describe('password visibility toggle', () => {
    it('masks the password by default and offers a show/hide toggle', () => {
      render(<Input label="Password" type="password" defaultValue="secret" />)

      const input = screen.getByLabelText('Password') as HTMLInputElement
      expect(input.type).toBe('password')

      const toggle = screen.getByRole('button', { name: 'Show password' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
    })

    it('reveals the password when toggled on and masks it again when toggled off', () => {
      render(<Input label="Password" type="password" defaultValue="secret" />)
      const input = screen.getByLabelText('Password') as HTMLInputElement

      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
      expect(input.type).toBe('text')
      expect(input.value).toBe('secret')
      expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')

      fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
      expect(input.type).toBe('password')
      expect(input.value).toBe('secret')
      expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('keeps toggles independent per field', () => {
      render(
        <>
          <Input label="Password" type="password" defaultValue="one" />
          <Input label="Confirm Password" type="password" defaultValue="two" />
        </>
      )

      const [first, second] = screen.getAllByLabelText(/password/i) as HTMLInputElement[]
      fireEvent.click(screen.getAllByRole('button', { name: 'Show password' })[1])

      expect(first.type).toBe('password')
      expect(second.type).toBe('text')
    })

    it('does not render a toggle for non-password inputs', () => {
      render(<Input label="Email address" type="email" />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
