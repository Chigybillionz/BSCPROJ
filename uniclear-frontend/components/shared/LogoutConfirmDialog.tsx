'use client'

import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LogOut, AlertTriangle } from 'lucide-react'

interface LogoutConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

export function LogoutConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Confirm Sign Out" className="max-w-md">
      <div className="space-y-4 pt-1">
        <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Do you want to log out from UniClear?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You will need to sign in again with your email and password to access your dashboard and records.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium"
          >
            No, Stay Signed In
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            className="px-4 py-2 text-sm font-semibold flex items-center gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            Yes, Log Out
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
