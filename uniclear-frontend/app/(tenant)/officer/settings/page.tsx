'use client'

import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { officersApi } from '@/lib/api/officers.api'
import { officerStampsApi, OfficerStamp } from '@/lib/api/officerStamps.api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Upload,
  PenTool,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Building,
  Layers,
  Sparkles,
  Info
} from 'lucide-react'

export default function OfficerSettingsPage() {
  const [stamps, setStamps] = useState<OfficerStamp[]>([])
  const [loadingStamps, setLoadingStamps] = useState(true)

  // Upload state
  const [uploadName, setUploadName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Mode: Upload PNG vs Draw Signature
  const [mode, setMode] = useState<'upload' | 'draw'>('upload')
  const [drawName, setDrawName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Fetch officer profile details
  const { data: meRes, isLoading: meLoading } = useQuery({
    queryKey: ['officer', 'me'],
    queryFn: () => officersApi.getMe().then((r: any) => r.data.data),
  })

  // Load stamps
  const loadStamps = async () => {
    try {
      setLoadingStamps(true)
      const res = await officerStampsApi.getAll()
      setStamps(res.data.data || [])
    } catch {
      toast.error('Failed to load stamps')
    } finally {
      setLoadingStamps(false)
    }
  }

  useEffect(() => {
    loadStamps()
  }, [])

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (!selected.type.startsWith('image/')) {
        toast.error('Please upload an image file (PNG recommended with transparent background)')
        return
      }
      setFile(selected)
      const reader = new FileReader()
      reader.onload = () => setFilePreview(reader.result as string)
      reader.readAsDataURL(selected)
    }
  }

  // Upload submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadName.trim()) {
      toast.error('Please enter a name for your stamp (e.g. HOD Official Stamp)')
      return
    }
    if (!file) {
      toast.error('Please select an image file to upload')
      return
    }

    try {
      setUploading(true)
      const res = await officerStampsApi.upload(uploadName.trim(), file)
      setStamps(prev => [...prev, res.data.data])
      setUploadName('')
      setFile(null)
      setFilePreview(null)
      toast.success('Official stamp uploaded and ready for clearance endorsements!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload stamp')
    } finally {
      setUploading(false)
    }
  }

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    setHasDrawn(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()

    let x, y
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    let x, y
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1E293B'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasDrawn(false)
    }
  }

  const handleSaveDrawing = async () => {
    if (!drawName.trim()) {
      toast.error('Please enter a name for this digital signature')
      return
    }
    if (!canvasRef.current || !hasDrawn) {
      toast.error('Please draw your signature on the canvas first')
      return
    }

    try {
      setUploading(true)
      const canvas = canvasRef.current
      const dataUrl = canvas.toDataURL('image/png')
      const blob = await (await fetch(dataUrl)).blob()
      const drawnFile = new File([blob], `${drawName.replace(/\s+/g, '_')}.png`, { type: 'image/png' })

      const res = await officerStampsApi.upload(drawName.trim(), drawnFile)
      setStamps(prev => [...prev, res.data.data])
      setDrawName('')
      clearCanvas()
      toast.success('Digital signature saved successfully!')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save drawn signature')
    } finally {
      setUploading(false)
    }
  }

  // Delete stamp
  const handleDelete = async (id: string) => {
    try {
      await officerStampsApi.delete(id)
      setStamps(prev => prev.filter(s => s.id !== id))
      toast.success('Stamp deleted')
    } catch {
      toast.error('Failed to delete stamp')
    }
  }

  const assignment = meRes?.stageAssignments?.[0]

  return (
    <div className="w-full space-y-6 max-w-5xl pb-10">
      <PageHeader
        title="Officer Settings & Digital Stamps"
        subtitle="Manage your profile and digital clearance endorsement stamps/signatures"
      />

      {/* Officer Profile Card */}
      <Card className="border border-[var(--color-border)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-base font-bold text-[var(--color-text)]">
              {meLoading ? 'Loading Profile...' : `${meRes?.firstName ?? ''} ${meRes?.lastName ?? ''}`}
            </h3>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Clearance Officer Account
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            Active Officer
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs">
          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-muted)] mb-1">
              Assigned Stage
            </p>
            <p className="font-semibold text-sm text-[var(--color-text)] flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
              <span>{assignment?.stage?.name || 'Not Assigned'}</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-muted)] mb-1">
              Scope / Jurisdiction
            </p>
            <p className="font-semibold text-sm text-[var(--color-text)] flex items-center gap-1.5">
              <Building className="h-4 w-4 text-sky-600 shrink-0" />
              <span>{assignment?.department?.name || assignment?.faculty?.name || 'University Wide'}</span>
            </p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--color-muted)] mb-1">
              Sequence Order
            </p>
            <p className="font-mono font-bold text-sm text-[var(--color-text)]">
              #{assignment?.stage?.orderIndex ?? 1}
            </p>
          </div>
        </div>
      </Card>

      {/* Main Stamps Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Upload or Draw New Stamp */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border border-[var(--color-border)] shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)] mb-4">
              <div>
                <h4 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Create Digital Stamp / Signature</span>
                </h4>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Appended to student clearance records as official proof
                </p>
              </div>

              {/* Toggle Modes */}
              <div className="flex items-center p-0.5 bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'upload'
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Upload PNG
                </button>
                <button
                  type="button"
                  onClick={() => setMode('draw')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    mode === 'draw'
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xs'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                  }`}
                >
                  Draw Signature
                </button>
              </div>
            </div>

            {mode === 'upload' ? (
              /* Mode 1: PNG Upload Form */
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] mb-1 block">
                    Stamp / Seal Title
                  </label>
                  <Input
                    placeholder="e.g. HOD Clearance Seal, Official Signature"
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] mb-1 block">
                    Upload Stamp Image (PNG Recommended)
                  </label>
                  <div className="border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] rounded-xl p-4 text-center cursor-pointer transition-colors relative bg-[var(--color-bg)]/40">
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {filePreview ? (
                      <div className="flex flex-col items-center">
                        <div className="relative w-32 h-24 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:8px_8px] rounded-lg border border-[var(--color-border)] flex items-center justify-center p-2 mb-2">
                          <Image
                            src={filePreview}
                            alt="Stamp Preview"
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                        <p className="text-xs font-semibold text-[var(--color-text)] truncate max-w-xs">
                          {file?.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)] mt-0.5">Click to replace</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-2">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-[var(--color-primary)] flex items-center justify-center mb-2">
                          <Upload className="h-5 w-5" />
                        </div>
                        <p className="text-xs font-semibold text-[var(--color-text)]">
                          Choose a PNG file or drag & drop here
                        </p>
                        <p className="text-[11px] text-[var(--color-muted)] mt-1">
                          Transparent background PNG works best (Max 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full text-xs font-bold"
                  loading={uploading}
                  disabled={!uploadName.trim() || !file}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Save & Register Official Stamp
                </Button>
              </form>
            ) : (
              /* Mode 2: Interactive Draw Signature Canvas */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--color-text)] mb-1 block">
                    Signature Title
                  </label>
                  <Input
                    placeholder="e.g. Clearance Officer Signature"
                    value={drawName}
                    onChange={e => setDrawName(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[var(--color-text)]">
                      Draw Signature / Initials
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[11px] text-[var(--color-muted)] hover:text-rose-600 font-medium transition-colors"
                    >
                      Clear Pad
                    </button>
                  </div>
                  <div className="border border-[var(--color-border)] rounded-xl bg-white shadow-inner overflow-hidden flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={140}
                      className="w-full h-36 cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)] mt-1">
                    Sign inside the box using your mouse, trackpad, or touch screen.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveDrawing}
                  className="w-full text-xs font-bold"
                  loading={uploading}
                  disabled={!drawName.trim() || !hasDrawn}
                >
                  <PenTool className="h-3.5 w-3.5 mr-1.5" />
                  Save Digital Signature
                </Button>
              </div>
            )}
          </Card>

          {/* Quick Guidance Box */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
            <Info className="h-4 w-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              When reviewing a student in the verification interface, your active stamps will appear in the toolbar. Placing a stamp bakes your digital endorsement into the student&apos;s approved clearance record.
            </p>
          </div>
        </div>

        {/* Right: Active Stamps Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border border-[var(--color-border)] shadow-xs flex flex-col h-full">
            <div className="pb-3 border-b border-[var(--color-border)] mb-4">
              <h4 className="text-sm font-bold text-[var(--color-text)] flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Your Active Stamps Gallery ({stamps.length})</span>
              </h4>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Stamps linked to your account for student approval endorsements
              </p>
            </div>

            {loadingStamps ? (
              <div className="py-16 text-center text-xs text-[var(--color-muted)]">
                Loading stamps...
              </div>
            ) : stamps.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                  <PenTool className="h-6 w-6" />
                </div>
                <h5 className="text-sm font-semibold text-[var(--color-text)] mb-1">
                  No Stamps Uploaded Yet
                </h5>
                <p className="text-xs text-[var(--color-muted)]">
                  Upload a transparent PNG stamp or draw your signature on the left to start endorsing student clearance files.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 overflow-y-auto max-h-[500px] p-0.5">
                {stamps.map(stamp => (
                  <div
                    key={stamp.id}
                    className="p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl hover:shadow-xs transition-shadow flex flex-col justify-between group"
                  >
                    <div>
                      {/* Checkerboard container for transparency visualization */}
                      <div className="relative w-full h-28 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:8px_8px] bg-slate-50 rounded-lg border border-[var(--color-border)] flex items-center justify-center p-2 mb-2">
                        <Image
                          src={stamp.imageUrl}
                          alt={stamp.name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <p className="text-xs font-bold text-[var(--color-text)] truncate" title={stamp.name}>
                        {stamp.name}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)] font-mono mt-0.5">
                        Added: {new Date(stamp.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--color-border)]">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                        Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(stamp.id)}
                        className="text-[11px] text-[var(--color-muted)] hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50 flex items-center gap-1"
                        title="Delete stamp"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  )
}
