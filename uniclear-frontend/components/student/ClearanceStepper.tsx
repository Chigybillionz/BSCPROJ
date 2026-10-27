'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Check, Clock, X, ArrowRight, Sparkles, Layers, UploadCloud, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/format'
import { ROUTES } from '@/lib/constants'
import type { ClearanceRequest, ClearanceStage } from '@/types'

interface ClearanceStepperProps {
  stages: ClearanceStage[]
  request: ClearanceRequest
}

export function ClearanceStepper({ stages, request }: ClearanceStepperProps) {
  const router = useRouter()
  const isLargeStageSet = stages.length > 6

  // Dynamically calculate phase groups if there are many stages (e.g. 7+ stages)
  const phases = useMemo(() => {
    if (!isLargeStageSet) return []

    // 1. Check if stages have explicit scopes (DEPARTMENT, FACULTY, UNIVERSITY)
    const distinctScopes = Array.from(new Set(stages.map(s => s.scope).filter(Boolean)))
    if (distinctScopes.length > 1) {
      const scopeOrder: Array<'DEPARTMENT' | 'FACULTY' | 'UNIVERSITY'> = ['DEPARTMENT', 'FACULTY', 'UNIVERSITY']
      const scopeLabels: Record<string, string> = {
        DEPARTMENT: 'Departmental Verification',
        FACULTY: 'Faculty Clearance',
        UNIVERSITY: 'Institutional / Central Clearance',
      }

      const groups: Array<{ id: number; title: string; subtitle: string; stages: ClearanceStage[] }> = []
      let groupIdx = 1

      for (const scope of scopeOrder) {
        const matching = stages.filter(s => s.scope === scope)
        if (matching.length > 0) {
          groups.push({
            id: groupIdx++,
            title: scopeLabels[scope] || `${scope} Clearance`,
            subtitle: `${matching.length} stages (${matching[0].name} … ${matching[matching.length - 1].name})`,
            stages: matching,
          })
        }
      }

      const others = stages.filter(s => !s.scope || !scopeOrder.includes(s.scope as any))
      if (others.length > 0) {
        groups.push({
          id: groupIdx++,
          title: 'General Clearance',
          subtitle: `${others.length} stages`,
          stages: others,
        })
      }

      if (groups.length >= 2) return groups
    }

    // 2. Default: Dynamic Milestone Chunks with Zero Hardcoded Assumptions
    const phaseCount = stages.length > 12 ? 3 : 2
    const perPhase = Math.ceil(stages.length / phaseCount)
    const groups: Array<{ id: number; title: string; subtitle: string; stages: ClearanceStage[] }> = []

    for (let i = 0; i < phaseCount; i++) {
      const startIdx = i * perPhase
      const endIdx = Math.min(startIdx + perPhase, stages.length)
      const chunkStages = stages.slice(startIdx, endIdx)
      if (chunkStages.length === 0) continue

      const firstStage = chunkStages[0]
      const lastStage = chunkStages[chunkStages.length - 1]
      const subtitle = chunkStages.length === 1
        ? firstStage.name
        : `${firstStage.name} → ${lastStage.name}`

      groups.push({
        id: i + 1,
        title: `Milestone ${i + 1}: Stages ${startIdx + 1}–${endIdx}`,
        subtitle,
        stages: chunkStages,
      })
    }

    return groups
  }, [stages, isLargeStageSet])

  // Determine current active phase dynamically
  const activePhaseId = useMemo(() => {
    if (!isLargeStageSet || phases.length === 0) return 1
    const activeIdx = stages.findIndex(s => s.id === request.currentStageId)
    if (activeIdx === -1) {
      return request.status === 'COMPLETED' ? phases[phases.length - 1].id : phases[0].id
    }
    const currentStage = stages[activeIdx]
    const matchingPhase = phases.find(p => p.stages.some(s => s.id === currentStage.id))
    return matchingPhase ? matchingPhase.id : phases[0].id
  }, [stages, request, isLargeStageSet, phases])

  const [selectedPhase, setSelectedPhase] = useState<number>(activePhaseId)
  const [viewMode, setViewMode] = useState<'grouped' | 'full'>(isLargeStageSet ? 'grouped' : 'full')

  const displayedStages = useMemo(() => {
    if (!isLargeStageSet || viewMode === 'full') return stages
    const currentPhase = phases.find(p => p.id === selectedPhase)
    return currentPhase ? currentPhase.stages : stages
  }, [isLargeStageSet, viewMode, stages, phases, selectedPhase])

  return (
    <div className="space-y-6">
      {/* Top Phase Header / Progress Pill */}
      {isLargeStageSet && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {phases.map(phase => {
              const phaseApproved = phase.stages.filter(s =>
                request.stageApprovals?.some(a => a.stageId === s.id && a.status === 'APPROVED')
              ).length
              const isPhaseDone = phaseApproved === phase.stages.length
              const isPhaseActive = phase.id === selectedPhase

              return (
                <button
                  key={phase.id}
                  onClick={() => {
                    setSelectedPhase(phase.id)
                    setViewMode('grouped')
                  }}
                  className={cn(
                    'relative px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5',
                    isPhaseActive
                      ? 'text-[var(--color-primary)] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {isPhaseActive && (
                    <motion.div
                      layoutId="activePhaseTab"
                      className="absolute inset-0 bg-white rounded-md"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    {isPhaseDone ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    )}
                    {phase.title.includes(':') ? phase.title.split(':')[0] : phase.title}
                  </span>
                  <span className="relative z-10 text-[10px] text-slate-400">
                    ({phaseApproved}/{phase.stages.length})
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => setViewMode(v => (v === 'grouped' ? 'full' : 'grouped'))}
            className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] flex items-center gap-1 self-end sm:self-auto"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{viewMode === 'grouped' ? 'View All Stages (Full)' : 'Group by Phases'}</span>
          </button>
        </div>
      )}

      {/* Active Phase Dynamic Subheading */}
      {isLargeStageSet && viewMode === 'grouped' && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-1 -mt-2">
          <p className="text-xs font-bold text-[var(--color-text)]">
            {phases.find(p => p.id === selectedPhase)?.title}
          </p>
          <p className="text-[11px] text-[var(--color-muted)]">
            {phases.find(p => p.id === selectedPhase)?.subtitle}
          </p>
        </div>
      )}

      {/* Modern Stepper Grid / Track */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <AnimatePresence mode="popLayout">
          {displayedStages.map((stage, idx) => {
            const approval = request.stageApprovals?.find(a => a.stageId === stage.id)
            const isActive = request.currentStageId === stage.id
            const isCompleted = approval?.status === 'APPROVED'
            const isRejected = approval?.status === 'REJECTED'
            const isSubmitted = isActive && request.stageStatus === 'SUBMITTED'

            // Check if required documents are uploaded for this stage
            const stageRequirements = stage.documentRequirements || []
            const uploadedForThisStage = request.documents?.filter(d =>
              stageRequirements.some(r => r.documentTypeId === d.documentTypeId && d.status !== 'REJECTED')
            ) || []
            const requiredCount = stageRequirements.filter(r => r.isRequired).length
            const isDocsReady = requiredCount > 0 && uploadedForThisStage.length >= requiredCount

            const globalOrder = stage.orderIndex || stages.findIndex(s => s.id === stage.id) + 1

            return (
              <motion.div
                key={stage.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => {
                  router.push(`${ROUTES.student.documents}?requestId=${request.id}&stageId=${stage.id}`)
                }}
                className={cn(
                  'relative rounded-xl p-4 border transition-all flex flex-col justify-between group overflow-hidden cursor-pointer hover:shadow-md hover:border-[var(--color-primary)] active:scale-[0.99]',
                  isCompleted && 'bg-emerald-50/40 border-emerald-200/80 shadow-xs',
                  isActive && !isSubmitted && 'bg-white border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/15 shadow-sm',
                  isSubmitted && 'bg-amber-50/40 border-amber-200/80 shadow-xs',
                  isRejected && 'bg-rose-50/40 border-rose-200/80 shadow-xs',
                  !isCompleted && !isActive && !isRejected && 'bg-white border-slate-200 hover:border-slate-300'
                )}
              >
                {/* Active current stage indicator */}
                {isActive && !isSubmitted ? (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md">
                    Current Review
                  </span>
                ) : isDocsReady && !isCompleted ? (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Docs Uploaded
                  </span>
                ) : null}

                <div>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className={cn(
                        'h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform group-hover:scale-105',
                        isCompleted && 'bg-emerald-600 text-white',
                        isActive && !isSubmitted && 'bg-[var(--color-primary)] text-white shadow-xs',
                        isSubmitted && 'bg-amber-500 text-white',
                        isRejected && 'bg-rose-600 text-white',
                        !isCompleted && !isActive && !isRejected && 'bg-slate-100 text-slate-700 border border-slate-200'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[3]" />
                      ) : isRejected ? (
                        <X className="h-4 w-4 stroke-[3]" />
                      ) : (
                        globalOrder
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-xs font-bold truncate leading-snug',
                        isCompleted ? 'text-emerald-950' : isActive ? 'text-slate-900' : 'text-slate-800'
                      )}>
                        {stage.name}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)] truncate">
                        Stage #{globalOrder} • {stage.scope || 'UNIVERSITY'}
                      </p>
                    </div>
                  </div>

                  {stage.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {stage.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] mt-2">
                  <span
                    className={cn(
                      'font-semibold inline-flex items-center gap-1',
                      isCompleted && 'text-emerald-700',
                      isSubmitted && 'text-amber-700',
                      isRejected && 'text-rose-700',
                      isActive && !isSubmitted && 'text-[var(--color-primary)]',
                      !isCompleted && !isSubmitted && !isRejected && !isActive && 'text-slate-600'
                    )}
                  >
                    {isCompleted ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Approved</span>
                      </>
                    ) : isRejected ? (
                      <>
                        <X className="h-3 w-3" />
                        <span>Action Required</span>
                      </>
                    ) : isSubmitted ? (
                      <>
                        <Clock className="h-3 w-3" />
                        <span>Under Review</span>
                      </>
                    ) : isActive ? (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>Active Review</span>
                      </>
                    ) : isDocsReady ? (
                      <>
                        <FileCheck className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700">Uploaded</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-3 w-3 text-slate-500" />
                        <span>Ready to Upload</span>
                      </>
                    )}
                  </span>

                  {isCompleted && approval?.createdAt ? (
                    <span className="text-[10px] text-slate-400">
                      {formatDate(approval.createdAt)}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[var(--color-primary)] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      {isCompleted ? 'View' : 'Upload'} <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
