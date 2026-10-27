'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface RejectDialogProps {
  onConfirm: (remarks: string) => void
  onCancel:  () => void
  isPending?: boolean
}

export function RejectDialog({ onConfirm, onCancel, isPending }: RejectDialogProps) {
  const [remarks, setRemarks] = useState('')
  const tooShort = remarks.trim().length < 10

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] p-6 w-full max-w-md mx-4">
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">Reject Stage</h3>
        <p className="text-sm text-[var(--color-muted)] mb-4">Provide a clear reason so the student knows what to fix.</p>

        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {[
            'Incomplete requirements. Please upload missing documents.',
            'Uploaded documents are illegible or blurry. Please re-upload clear copies.',
            'Departmental receipts or dues not confirmed by bursary.',
            'Uploaded files belong to an incorrect academic session.',
          ].map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => setRemarks(chip)}
              className="text-[11px] text-left px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200/60 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <textarea
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          placeholder="Explain the rejection reason in detail..."
          rows={3}
          className={cn(
            'w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-rejected)]',
            remarks.length > 0 && tooShort && 'border-[var(--color-rejected)]'
          )}
          aria-label="Rejection reason"
        />
        {remarks.length > 0 && tooShort && (
          <p className="text-xs text-[var(--color-rejected)] mt-1">Please provide at least 10 characters</p>
        )}

        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="secondary" onClick={onCancel} className="text-xs">Cancel</Button>
          <Button
            variant="danger"
            disabled={tooShort}
            loading={isPending}
            onClick={() => onConfirm(remarks.trim())}
            className="text-xs font-bold"
          >
            Confirm Rejection
          </Button>
        </div>

      </div>
    </div>
  )
}
