'use client'

import { Check, Lock, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import type { ClearanceRequest, ClearanceStage } from '@/types'

interface ClearanceStepperProps {
  stages: ClearanceStage[]
  request: ClearanceRequest
}

export function ClearanceStepper({ stages, request }: ClearanceStepperProps) {
  return (
    <>
      {/* Desktop horizontal — scrolls when there are many stages */}
      <div className="hidden md:flex items-center gap-0 overflow-x-auto pb-2">
        {stages.map((stage, i) => {
          const approval = request.stageApprovals?.find(a => a.stageId === stage.id)
          const isActive    = request.currentStageId === stage.id
          const isCompleted = approval?.status === 'APPROVED'
          const isRejected  = approval?.status === 'REJECTED'
          const isSubmitted = isActive && request.stageStatus === 'SUBMITTED'
          const isLocked    = !isActive && !isCompleted && !isRejected

          return (
            <div key={stage.id} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all',
                  isCompleted && 'bg-[var(--color-approved)] border-[var(--color-approved)] text-white',
                  isActive    && !isSubmitted && 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white animate-pulse',
                  isSubmitted && 'bg-amber-500 border-amber-500 text-white',
                  isRejected  && 'bg-[var(--color-rejected)] border-[var(--color-rejected)] text-white',
                  isLocked    && 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-muted)]',
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : isLocked ? <Lock className="h-3 w-3" /> : i + 1}
                </div>
                <span className="mt-1.5 text-xs font-medium text-center max-w-[80px] leading-tight text-[var(--color-text)]">
                  {stage.name}
                </span>
                <span className={cn('text-[10px] mt-0.5', isCompleted ? 'text-[var(--color-approved)]' : isRejected ? 'text-[var(--color-rejected)]' : isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]')}>
                  {isCompleted ? 'Done' : isRejected ? 'Rejected' : isSubmitted ? 'In Review' : isActive ? 'Upload Docs' : 'Locked'}
                </span>
                {isCompleted && approval?.attachmentUrl && (
                  <a href={approval.attachmentUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1">
                    📄 View Receipt
                  </a>
                )}
              </div>
              {i < stages.length - 1 && (
                <div className={cn('w-10 md:w-14 h-0.5 mx-2 mb-6 shrink-0', isCompleted ? 'bg-[var(--color-approved)]' : 'bg-[var(--color-border)]')} />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {stages.map((stage, i) => {
          const approval    = request.stageApprovals?.find(a => a.stageId === stage.id)
          const isActive    = request.currentStageId === stage.id
          const isCompleted = approval?.status === 'APPROVED'
          const isRejected  = approval?.status === 'REJECTED'
          const isSubmitted = isActive && request.stageStatus === 'SUBMITTED'
          const isLocked    = !isActive && !isCompleted && !isRejected

          return (
            <div key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 shrink-0',
                  isCompleted && 'bg-[var(--color-approved)] border-[var(--color-approved)] text-white',
                  isActive    && !isSubmitted && 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white',
                  isSubmitted && 'bg-amber-500 border-amber-500 text-white',
                  isRejected  && 'bg-[var(--color-rejected)] border-[var(--color-rejected)] text-white',
                  isLocked    && 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-muted)]',
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : isLocked ? <Lock className="h-3 w-3" /> : i + 1}
                </div>
                {i < stages.length - 1 && <div className="w-0.5 flex-1 bg-[var(--color-border)] my-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-[var(--color-text)]">{stage.name}</p>
                <p className={cn('text-xs flex flex-col gap-1', isCompleted ? 'text-[var(--color-approved)]' : isRejected ? 'text-[var(--color-rejected)]' : isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]')}>
                  <span className="flex items-center gap-1">
                    {isCompleted
                      ? <><Check className="h-3 w-3" /> Approved {approval?.createdAt ? formatDate(approval.createdAt) : ''}</>
                      : isRejected
                      ? <><X className="h-3 w-3" /> Rejected</>
                      : isSubmitted
                      ? <><Clock className="h-3 w-3" /> In Review</>
                      : isActive
                      ? <><Clock className="h-3 w-3" /> Upload Docs</>
                      : <><Lock className="h-3 w-3" /> Locked</>
                    }
                  </span>
                  {isCompleted && approval?.attachmentUrl && (
                    <a href={approval.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      📄 View Signed Receipt
                    </a>
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
