'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clearanceApi } from '@/lib/api/clearance.api'
import { formatDate } from '@/lib/utils/format'
import { 
  ShieldCheck, 
  Search, 
  AlertCircle, 
  Building2, 
  Calendar, 
  Hash, 
  CheckCircle2, 
  Printer, 
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface VerificationResult {
  isValid: boolean
  clearanceNumber: string
  status: string
  completedAt: string
  student: {
    fullName: string
    jambRegNo?: string
    matricNo?: string
    faculty?: string
    department?: string
  }
  university: {
    name: string
    slug: string
    logoUrl?: string | null
    primaryColor?: string | null
  }
  session: string
  campaign: string
  stages: Array<{ stageName: string; approvedAt: string }>
  issuedData?: Record<string, any> | null
}

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialNumber = searchParams.get('number') || ''

  const [clearanceNumber, setClearanceNumber] = useState(initialNumber)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const performVerification = async (num: string) => {
    const trimmed = num.trim()
    if (!trimmed) {
      setError('Please enter a clearance verification number.')
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await clearanceApi.verify(trimmed)
      if (res.data?.success && res.data?.data) {
        setResult(res.data.data)
      } else {
        setError('Clearance record not found or clearance is not yet completed.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to verify clearance record. Please verify the clearance number.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialNumber) {
      performVerification(initialNumber)
    }
  }, [initialNumber])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clearanceNumber.trim()) return
    router.push(`/verify?number=${encodeURIComponent(clearanceNumber.trim())}`)
    performVerification(clearanceNumber)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 mb-1">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)]">
            Clearance Certificate Verification
          </h1>
          <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto">
            Verify the authenticity of digital clearance certificates issued by accredited institutions on UniClear.
          </p>
        </div>

        {/* Search Input Card */}
        <Card className="p-4 sm:p-6 shadow-sm border border-[var(--color-border)]">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter Clearance Number (e.g. CLR-2026-X89J-A3B4)"
                value={clearanceNumber}
                onChange={(e) => setClearanceNumber(e.target.value)}
                icon={<Hash className="h-4 w-4 text-[var(--color-muted)]" />}
                className="font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={loading} className="shrink-0 gap-2">
              <Search className="h-4 w-4" />
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
        </Card>

        {/* Error State */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                Verification Failed
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Verified Result Card */}
        {result && (
          <Card className="overflow-hidden border-2 border-emerald-500/80 shadow-md">
            {/* Verification Banner */}
            <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs uppercase tracking-wider font-bold">
                  Official Record Verified
                </span>
              </div>
              <span className="text-xs font-mono font-medium opacity-90">
                {result.clearanceNumber}
              </span>
            </div>

            <div className="p-6 space-y-6">
              {/* Institution Header */}
              <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
                <div 
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white text-xl font-bold shrink-0"
                  style={{ backgroundColor: result.university.primaryColor || '#1B4F72' }}
                >
                  {result.university.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img 
                      src={result.university.logoUrl} 
                      alt={result.university.name} 
                      className="h-full w-full object-contain rounded-lg" 
                    />
                  ) : (
                    result.university.name?.[0] || 'U'
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--color-text)]">
                    {result.university.name}
                  </h2>
                  <p className="text-xs text-[var(--color-muted)] flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Accredited University Institution
                  </p>
                </div>
              </div>

              {/* Student and Clearance Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] space-y-1">
                  <p className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide">
                    Cleared Student
                  </p>
                  <p className="font-semibold text-[var(--color-text)] text-base">
                    {result.student.fullName}
                  </p>
                  {result.student.matricNo && (
                    <p className="text-xs text-[var(--color-muted)] font-mono">
                      Matric No: {result.student.matricNo}
                    </p>
                  )}
                  {result.student.jambRegNo && (
                    <p className="text-xs text-[var(--color-muted)] font-mono">
                      JAMB Reg No: {result.student.jambRegNo}
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] space-y-1">
                  <p className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide">
                    Academic Scope
                  </p>
                  <p className="font-semibold text-[var(--color-text)]">
                    {result.student.department || 'N/A'}
                  </p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Faculty of {result.student.faculty || 'N/A'}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] flex items-center gap-1 mt-1">
                    <Calendar className="h-3 w-3" />
                    Session: {result.session}
                  </p>
                </div>
              </div>

              {/* Clearance Metadata */}
              <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Campaign</span>
                  <span className="font-medium text-[var(--color-text)]">{result.campaign}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Clearance Status</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    CLEARED / COMPLETED
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--color-border)]">
                  <span className="text-[var(--color-muted)]">Completion Date</span>
                  <span className="font-medium text-[var(--color-text)]">
                    {result.completedAt ? formatDate(result.completedAt) : 'N/A'}
                  </span>
                </div>
                {result.issuedData && Object.keys(result.issuedData).length > 0 && (
                  Object.entries(result.issuedData).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center py-1 border-b border-[var(--color-border)] last:border-0">
                      <span className="text-[var(--color-muted)]">{k}</span>
                      <span className="font-medium text-[var(--color-text)]">{String(v)}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Departmental Clearances Checklist */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Approved Clearance Stages ({result.stages.length})
                </h3>
                <div className="space-y-1.5">
                  {result.stages.map((st, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2 rounded-md bg-[var(--color-bg-secondary)] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="font-medium text-[var(--color-text)]">{st.stageName}</span>
                      </div>
                      <span className="text-[var(--color-muted)]">
                        Approved {formatDate(st.approvedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="secondary" 
                  className="w-full gap-2 text-xs"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" /> Print Verification Record
                </Button>
                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full gap-2 text-xs border border-[var(--color-border)]">
                    <ExternalLink className="h-4 w-4" /> UniClear Portal
                  </Button>
                </Link>
              </div>

            </div>
          </Card>
        )}

        {/* Footer info */}
        <div className="text-center text-xs text-[var(--color-muted)] space-y-1 pt-4">
          <p>
            UniClear Secure Verification Engine • Authenticated Academic Clearance
          </p>
          <p>
            Verification records are cryptographically timestamped and audit-sealed.
          </p>
        </div>

      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
