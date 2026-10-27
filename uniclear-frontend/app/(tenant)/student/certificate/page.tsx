'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenantStore } from '@/store/useTenantStore'
import { useClearanceStatus } from '@/features/clearance/hooks/useClearance'
import { clearanceApi } from '@/lib/api/clearance.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { Lock, PartyPopper, Download } from 'lucide-react'
import { ErrorState, EmptyState } from '@/components/shared/EmptyState'
import { BrandLogo } from '@/components/shared/BrandLogo'
import { formatDate } from '@/lib/utils/format'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export default function CertificatePage() {
  const tenant  = useTenantStore()
  const [isDownloading, setIsDownloading] = useState(false)

  const router = useRouter()
  const { data: clearances, isLoading, isError } = useClearanceStatus()
  const clearance = clearances?.find(c => c.status === 'COMPLETED')

  const { data: _certificate } = useQuery({
    queryKey: ['certificate', clearance?.id],
    queryFn:  () => clearanceApi.getCertificate(clearance!.id).then((r: any) => r.data.data),
    enabled:  !!clearance?.id && clearance.status === 'COMPLETED',
  })

  if (isLoading) return <LoadingSkeleton rows={4} />
  if (isError)   return <ErrorState />
  if (!clearance || clearance.status !== 'COMPLETED') {
    return (
      <EmptyState
        icon={<Lock className="h-10 w-10" />}
        title="Certificate not available"
        description="Your clearance must be fully completed before you can download your certificate."
        action={{ label: '← Back to Dashboard', onClick: () => router.push(ROUTES.student.dashboard) }}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Celebration header */}
      <div className="text-center py-6">
        <PartyPopper className="h-12 w-12 text-[var(--color-primary)] mb-3 mx-auto" />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Clearance Complete!</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Congratulations! All your clearance stages have been approved.
        </p>
      </div>

      {/* Certificate card */}
      <Card className="relative border-2 border-[var(--color-primary)] text-center space-y-4 py-8 px-6 overflow-hidden">
        {/* Top-Right Badge: Clearance Reg Number & JAMB Reg Number */}
        <div className="sm:absolute sm:top-5 sm:right-5 text-right bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 shadow-xs inline-block mx-auto mb-2 sm:mb-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)]">Clearance Reg No</p>
          <p className="font-mono font-bold text-sm text-[var(--color-primary)]">
            {clearance.clearanceNumber || 'Pending'}
          </p>
          {clearance.student?.jambRegNo && (
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="text-[9px] uppercase font-semibold text-[var(--color-muted)]">JAMB: </span>
              {clearance.student.jambRegNo}
            </p>
          )}
        </div>

        <BrandLogo
          logoUrl={tenant.logoUrl}
          alt={tenant.name || 'UniClear'}
          size={64}
          className="h-16 w-16 rounded-xl mx-auto ring-1 ring-black/5"
        />

        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide">University Clearance Certificate</p>
          <p className="text-lg font-bold text-[var(--color-text)] mt-1">{tenant.name}</p>
        </div>

        <div className="border-t border-b border-[var(--color-border)] py-4 space-y-2">
          <p className="text-sm text-[var(--color-muted)]">This certifies that</p>
          <p className="text-base font-semibold text-[var(--color-text)]">
            {clearance.student?.firstName} {clearance.student?.lastName}
          </p>

          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {clearance.clearanceNumber && (
              <div className="inline-block bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-lg text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] block">Reg Number</span>
                <span className="text-sm font-bold font-mono text-[var(--color-primary)]">{clearance.clearanceNumber}</span>
              </div>
            )}
            {clearance.student?.jambRegNo ? (
              <div className="inline-block bg-[var(--color-primary)] text-white px-3.5 py-1.5 rounded-lg text-left">
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80 block">JAMB Reg Number</span>
                <span className="text-sm font-bold font-mono">{clearance.student.jambRegNo}</span>
              </div>
            ) : (
              <p className="text-xs text-amber-500 mt-1">⏳ JAMB Reg Number not available</p>
            )}
          </div>

          <p className="text-sm text-[var(--color-muted)] mt-2">
            has satisfactorily completed all clearance requirements
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <StatusBadge status="COMPLETED" />
          <span className="text-xs text-[var(--color-muted)]">
            {clearance.completedAt ? formatDate(clearance.completedAt) : ''}
          </span>
        </div>

        <Button 
          size="lg" 
          className="w-full mt-2 font-semibold"
          disabled={isDownloading}
          onClick={async () => {
            try {
              setIsDownloading(true)
              toast.loading('Generating official certificate with digital stamps...', { id: 'cert-dl' })
              await clearanceApi.downloadCertificatePdf(
                clearance.id,
                `Clearance_Certificate_${clearance.student?.jambRegNo || 'student'}.pdf`
              )
              toast.success('Certificate downloaded successfully!', { id: 'cert-dl' })
            } catch {
              // Fallback to client-side generator if offline/server proxy issue
              import('@/lib/utils/pdf').then(({ generateCertificatePDF }) => {
                generateCertificatePDF({
                  studentName: `${clearance.student?.firstName} ${clearance.student?.lastName}`,
                  jambRegNo: clearance.student?.jambRegNo ?? 'N/A',
                  matricNo: clearance.student?.matricNo ?? 'N/A',
                  faculty: clearance.student?.faculty?.name ?? 'N/A',
                  department: clearance.student?.department?.name ?? 'N/A',
                  universityName: tenant.name,
                  primaryColor: tenant.primaryColor,
                  campaignName: clearance.campaign?.name ?? 'Clearance Campaign',
                  completedAt: clearance.completedAt ? formatDate(clearance.completedAt) : 'N/A',
                  clearanceNumber: clearance.clearanceNumber,
                  templateUrl: clearance.campaign?.customCertificateUrl || tenant.certificateTemplateUrl,
                  coordinates: (clearance.campaign?.customCertificateCoords || tenant.certificateCoordinates) as any
                })
              })
              toast.success('Certificate generated!', { id: 'cert-dl' })
            } finally {
              setIsDownloading(false)
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Generating Certificate...' : 'Download PDF Certificate'}
        </Button>

        {clearance.clearanceNumber && (
          <div className="pt-1">
            <Link 
              href={`/verify?number=${encodeURIComponent(clearance.clearanceNumber)}`}
              target="_blank"
              className="inline-flex items-center text-xs text-[var(--color-primary)] hover:underline font-medium"
            >
              Verify Certificate Online ↗
            </Link>
          </div>
        )}
      </Card>

      <div className="text-center">
        <Link href={ROUTES.student.dashboard} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
