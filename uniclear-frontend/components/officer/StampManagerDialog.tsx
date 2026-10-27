'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { officerStampsApi, OfficerStamp } from '@/lib/api/officerStamps.api'
import { normalizeDocUrl } from '@/lib/utils/format'
import { toast } from 'sonner'


export function StampManagerDialog({ stamps, onStampsChange }: { stamps: OfficerStamp[], onStampsChange: (s: OfficerStamp[]) => void }) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  // Upload state
  const [uploadName, setUploadName] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // Draw state
  const [mode, setMode] = useState<'upload' | 'draw'>('upload')
  const [drawName, setDrawName] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Clear canvas when switching modes
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }, [mode])

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    
    let x, y;
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
    
    let x, y;
    if ('touches' in e) {
      const rect = canvasRef.current.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }
    
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'black'
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadName || !file) return
    try {
      setUploading(true)
      const res = await officerStampsApi.upload(uploadName, file)
      const newStamp = res.data.data
      onStampsChange([...stamps, newStamp])
      if (typeof window !== 'undefined') {
        localStorage.setItem('uniclear_default_stamp_id', newStamp.id)
      }
      setUploadName('')
      setFile(null)
      setOpen(false)
      toast.success('Stamp uploaded and saved as your active stamp!')
    } catch {
      toast.error('Failed to upload stamp')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveDrawing = async () => {
    if (!drawName || !canvasRef.current) return
    try {
      setUploading(true)
      
      // Convert canvas to File
      const blob = await new Promise<Blob | null>(resolve => canvasRef.current!.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error("Could not create image from canvas")
      const drawnFile = new File([blob], 'signature.png', { type: 'image/png' })

      const res = await officerStampsApi.upload(drawName, drawnFile)
      const newStamp = res.data.data
      onStampsChange([...stamps, newStamp])
      if (typeof window !== 'undefined') {
        localStorage.setItem('uniclear_default_stamp_id', newStamp.id)
      }
      setDrawName('')
      
      // Clear canvas
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)

      setOpen(false)
      toast.success('Signature saved and set as your active stamp!')
    } catch {
      toast.error('Failed to save signature')
    } finally {
      setUploading(false)
    }
  }


  const handleDelete = async (id: string) => {
    try {
      await officerStampsApi.delete(id)
      onStampsChange(stamps.filter(s => s.id !== id))
      toast.success('Stamp deleted')
    } catch {
      toast.error('Failed to delete stamp')
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary" size="sm" className="ml-auto shrink-0 text-xs h-8">
        Manage Signatures & Stamps
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Signatures & Stamps">
        <div className="mt-2 space-y-4">
          <div className="flex border border-[var(--color-border)] rounded-[var(--radius-sm)] overflow-hidden">
             <button onClick={() => setMode('upload')} className={`flex-1 py-1.5 text-xs font-semibold ${mode === 'upload' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] hover:bg-gray-100'}`}>Upload Image</button>
             <button onClick={() => setMode('draw')} className={`flex-1 py-1.5 text-xs font-semibold border-l border-[var(--color-border)] ${mode === 'draw' ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)] hover:bg-gray-100'}`}>Draw Signature</button>
          </div>

          {mode === 'upload' ? (
            <form onSubmit={handleUpload} className="flex flex-col gap-3 p-3 bg-[var(--color-bg)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
              <div className="space-y-1">
                <label htmlFor="uploadName" className="text-sm font-medium">Stamp Name</label>
                <Input id="uploadName" value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="e.g. Official Stamp" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="file" className="text-sm font-medium">Transparent Image (PNG)</label>
                <Input id="file" type="file" accept="image/png, image/jpeg" onChange={e => setFile(e.target.files?.[0] ?? null)} required />
              </div>
              <Button type="submit" loading={uploading} disabled={!uploadName || !file}>Upload Stamp</Button>
            </form>
          ) : (
            <div className="flex flex-col gap-3 p-3 bg-[var(--color-bg)] rounded-[var(--radius-sm)] border border-[var(--color-border)]">
              <div className="space-y-1">
                <label htmlFor="drawName" className="text-sm font-medium">Signature Name</label>
                <Input id="drawName" value={drawName} onChange={e => setDrawName(e.target.value)} placeholder="e.g. My Signature" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Draw Here</label>
                <div className="border border-[var(--color-border)] bg-white rounded-md cursor-crosshair touch-none">
                  <canvas 
                    ref={canvasRef}
                    width={360}
                    height={120}
                    className="w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <div className="flex justify-end mt-1">
                  <button 
                    onClick={() => { const ctx = canvasRef.current?.getContext('2d'); if (ctx) ctx.clearRect(0, 0, 360, 120); }}
                    className="text-[10px] text-[var(--color-muted)] hover:underline"
                  >
                    Clear Drawing
                  </button>
                </div>
              </div>
              <Button type="button" onClick={handleSaveDrawing} loading={uploading} disabled={!drawName}>Save Signature</Button>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <h4 className="text-sm font-semibold text-[var(--color-muted)] uppercase tracking-wide">Your Saved Assets</h4>
            {stamps.length === 0 && <p className="text-sm text-[var(--color-muted)]">No stamps/signatures uploaded yet.</p>}
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {stamps.map(stamp => (
                <div key={stamp.id} className="border border-[var(--color-border)] p-2 rounded relative group bg-white">
                  <div className="relative h-12 w-full mb-2 flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={normalizeDocUrl(stamp.imageUrl)} alt={stamp.name} className="h-full w-full object-contain" />
                  </div>

                  <p className="text-xs text-center truncate font-medium">{stamp.name}</p>
                  <button 
                    onClick={() => handleDelete(stamp.id)}
                    title="Delete stamp"
                    aria-label="Delete stamp"
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  )
}
