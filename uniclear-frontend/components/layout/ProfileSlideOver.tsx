import { useEffect, useState } from 'react'
import { X, Shield, Mail } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { getInitials } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { authApi } from '@/lib/api/auth.api'
import { useMutation } from '@tanstack/react-query'

interface ProfileSlideOverProps {
  open: boolean
  onClose: () => void
}

export function ProfileSlideOver({ open, onClose }: ProfileSlideOverProps) {
  const user = useAuthStore(s => s.user)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const { mutate: changePassword, isPending: changingPassword } = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully')
      setPasswordOpen(false)
      setCurrentPassword('')
      setNewPassword('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to change password')
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/40 transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative z-10 w-full max-w-sm bg-[var(--color-surface)] shadow-2xl h-full flex flex-col transform transition-transform duration-300 ease-in-out">
        
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h2 className="text-base font-semibold text-[var(--color-text)]">Profile Settings</h2>
          <button onClick={onClose} className="p-1 rounded-md text-[var(--color-muted)] hover:bg-[var(--color-bg)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-[var(--color-primary)] text-white text-3xl font-bold flex items-center justify-center shadow-lg mb-4">
              {user ? getInitials(
                user.student ? `${user.student.firstName} ${user.student.lastName}` : 
                user.officer ? `${user.officer.firstName} ${user.officer.lastName}` : 
                user.email
              ) : '?'}
            </div>
            <h3 className="text-lg font-bold text-[var(--color-text)]">
              {user?.student ? `${user.student.firstName} ${user.student.lastName}` : 
               user?.officer ? `${user.officer.firstName} ${user.officer.lastName}` : 
               user?.email?.split('@')[0] || 'User'}
            </h3>
            <p className="text-sm text-[var(--color-muted)] mt-1">{user?.role.replace('_', ' ')}</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Account Details</h4>
            
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4 space-y-4 border border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[var(--color-muted)]" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-muted)]">Email Address</p>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[var(--color-muted)]" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-muted)]">Access Role</p>
                  <p className="text-sm font-medium">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Preferences</h4>
            <div className="space-y-2">
              {user?.role === 'OFFICER' && (
                <Button 
                  variant="primary" 
                  className="w-full justify-start text-left" 
                  onClick={() => {
                    onClose()
                    window.location.href = '/officer/settings'
                  }}
                >
                  Manage Officer Stamps & Signatures
                </Button>
              )}
              <Button variant="secondary" className="w-full justify-start text-left" onClick={() => setPasswordOpen(true)}>
                Change Password
              </Button>
              <Button variant="secondary" className="w-full justify-start text-left" onClick={() => toast.info('To change personal info, please contact your University Admin.')}>
                Edit Personal Info
              </Button>
            </div>
          </div>
        </div>

      </div>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Change Password">
        <form onSubmit={(e) => { e.preventDefault(); changePassword(); }} className="space-y-4">
          <Input 
            label="Current Password" 
            type="password" 
            value={currentPassword} 
            onChange={e => setCurrentPassword(e.target.value)} 
            required 
          />
          <Input 
            label="New Password" 
            type="password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            required 
            minLength={8}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" loading={changingPassword}>Update</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
