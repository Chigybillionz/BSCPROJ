'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { universitiesApi } from '@/lib/api/misc.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, RefreshCw, Key, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

export default function DeveloperSettingsPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const [showKey, setShowKey] = useState(false)

  const hasAccess = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'

  const { data } = useQuery({
    queryKey: ['developer', 'api-key'],
    queryFn: () => universitiesApi.getApiKey().then(res => res.data.data),
    enabled: hasAccess,
  })

  const { mutate: generateKey, isPending } = useMutation({
    mutationFn: () => universitiesApi.generateApiKey().then(res => res.data.data),
    onSuccess: (newData) => {
      qc.setQueryData(['developer', 'api-key'], newData)
      toast.success('New API Key generated successfully')
      setShowKey(true)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate key')
    }
  })

  // Only allow Super Admins or Admins
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-[var(--color-muted)]">You do not have permission to view Developer Settings.</p>
      </div>
    )
  }

  const handleCopy = () => {
    if (data?.apiKey) {
      navigator.clipboard.writeText(data.apiKey)
      toast.success('API Key copied to clipboard')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Developer Settings"
        subtitle="Manage API keys and Webhook integrations"
      />

      <Card padding="md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Key className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">Campus ERP Integration (Webhook)</h3>
              <p className="text-sm text-[var(--color-muted)] mt-1">
                Use this API Key to securely push student admission records from your main University ERP portal directly into UniClear.
              </p>
            </div>

            <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2 block">
                  Your Secret API Key
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={data?.apiKey ? (showKey ? data.apiKey : '•'.repeat(40)) : 'No API Key generated yet'} 
                    readOnly 
                    className="font-mono flex-1"
                  />
                  <Button variant="secondary" disabled={!data?.apiKey} onClick={() => setShowKey(!showKey)}>
                    {showKey ? 'Hide' : 'Reveal'}
                  </Button>
                  <Button variant="secondary" disabled={!data?.apiKey} onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--color-border)]">
                <Button 
                  variant={data?.apiKey ? 'danger' : 'primary'} 
                  onClick={() => {
                    if (data?.apiKey && !confirm('Are you sure? Your existing integrations will break immediately.')) return
                    generateKey()
                  }}
                  loading={isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {data?.apiKey ? 'Revoke & Generate New Key' : 'Generate API Key'}
                </Button>
              </div>
            </div>

            {/* Webhook Documentation Snippet */}
            <div className="mt-8">
              <h4 className="text-sm font-semibold text-[var(--color-text)] mb-2">Integration Instructions</h4>
              <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto text-sm text-gray-300 font-mono">
                <p className="text-green-400 mb-2"># 1. Endpoint</p>
                <p>POST /api/v1/webhooks/students/sync</p>
                
                <p className="text-green-400 mt-4 mb-2"># 2. Headers</p>
                <p>Content-Type: application/json</p>
                <p>x-api-key: {"<YOUR_API_KEY>"}</p>

                <p className="text-green-400 mt-4 mb-2"># 3. Payload Example</p>
                <pre>{`{
  "students": [
    {
      "jambRegNo": "202412345AB",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@university.edu",
      "facultyName": "Science",
      "departmentName": "Computer Science",
      "sessionName": "2024/2025"
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
