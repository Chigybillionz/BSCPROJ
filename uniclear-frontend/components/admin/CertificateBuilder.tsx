'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { campaignsApi } from '@/lib/api/campaigns.api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Upload, Save, Eye, EyeOff, Trash2 } from 'lucide-react'

interface DraggableField {
  id: string
  type: string
  label: string
  x: number
  y: number
  size: number
  isVisible: boolean
  color: string
}

const FIELD_TYPES = [
  { value: 'STATIC', label: 'Custom Static Text' },
  { value: 'STUDENT_NAME', label: 'Student Name' },
  { value: 'JAMB_REG_NO', label: 'JAMB Reg Number' },
  { value: 'MATRIC_NO', label: 'Matric Number' },
  { value: 'FACULTY', label: 'Faculty' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'DATE', label: 'Date of Issue' },
  { value: 'CAMPAIGN_NAME', label: 'Campaign Name' },
  { value: 'UNIVERSITY_NAME', label: 'University Name' },
  { value: 'CLEARANCE_NUMBER', label: 'Clearance Number' },
]

export function CertificateBuilder({ campaign }: { campaign: any }) {
  const qc = useQueryClient()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [hideDefaultText, setHideDefaultText] = useState(false)
  const [fields, setFields] = useState<DraggableField[]>([
    { id: 'campaign', type: 'CAMPAIGN_NAME', label: 'Campaign Name', x: 50, y: 65, size: 20, isVisible: true, color: '#1a4b70' },
    { id: 'name', type: 'STUDENT_NAME', label: 'Student Name', x: 50, y: 47.5, size: 28, isVisible: true, color: '#000000' },
    { id: 'jamb', type: 'JAMB_REG_NO', label: 'JAMB Reg No', x: 50, y: 27.5, size: 14, isVisible: true, color: '#333333' },
    { id: 'date', type: 'DATE', label: 'Date of Issue', x: 50, y: 15, size: 12, isVisible: true, color: '#666666' },
  ])

  useEffect(() => {
    if (campaign?.customCertificateCoords) {
      const coords = campaign.customCertificateCoords
      if (coords.hideDefaultText !== undefined) {
        setHideDefaultText(coords.hideDefaultText)
      }
      if (coords.fields) {
        setFields(coords.fields)
      } else {
        // Migration from old schema
        const loadedFields = [
          { id: 'campaign', type: 'CAMPAIGN_NAME', label: 'Campaign Name', ...coords.campaign, isVisible: coords.campaign?.isVisible ?? true, color: coords.campaign?.color ?? '#1a4b70', x: coords.campaign?.x ?? 50, y: coords.campaign?.y ?? 65, size: coords.campaign?.size ?? 20 },
          { id: 'name', type: 'STUDENT_NAME', label: 'Student Name', ...coords.name, isVisible: coords.name?.isVisible ?? true, color: coords.name?.color ?? '#000000', x: coords.name?.x ?? 50, y: coords.name?.y ?? 47.5, size: coords.name?.size ?? 28 },
          { id: 'jamb', type: 'JAMB_REG_NO', label: 'JAMB Reg No', ...coords.jamb, isVisible: coords.jamb?.isVisible ?? true, color: coords.jamb?.color ?? '#333333', x: coords.jamb?.x ?? 50, y: coords.jamb?.y ?? 27.5, size: coords.jamb?.size ?? 14 },
          { id: 'date', type: 'DATE', label: 'Date of Issue', ...coords.date, isVisible: coords.date?.isVisible ?? true, color: coords.date?.color ?? '#666666', x: coords.date?.x ?? 50, y: coords.date?.y ?? 15, size: coords.date?.size ?? 12 },
        ]
        
        const loadedCustom = (coords.customFields || []).map((f: any) => ({
          id: f.id || `custom_${Math.random()}`,
          type: 'STATIC',
          label: f.text,
          x: f.x, y: f.y, size: f.size,
          isVisible: f.isVisible ?? true,
          color: f.color ?? '#000000'
        }))
        
        setFields([...loadedFields, ...loadedCustom])
      }
    }
  }, [campaign])

  const { mutate: uploadCert, isPending: uploadingCert } = useMutation({
    mutationFn: (file: File) => campaignsApi.uploadCertificateTemplate(campaign.id, file),
    onSuccess: () => {
      toast.success('Certificate template uploaded')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      router.refresh() // Force Next.js Server Component to refetch so image updates immediately
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Upload failed'),
  })

  const { mutate: saveCoords, isPending: savingCoords } = useMutation({
    mutationFn: () => {
      return campaignsApi.update(campaign.id, { customCertificateCoords: { fields, hideDefaultText } })
    },
    onSuccess: () => {
      toast.success('Coordinates saved successfully')
      qc.invalidateQueries({ queryKey: ['campaigns'] })
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Failed to save coordinates'),
  })

  // Visual drag logic
  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    setActiveFieldId(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    if (activeFieldId !== id || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    let newX = ((e.clientX - rect.left) / rect.width) * 100
    let newY = (1 - (e.clientY - rect.top) / rect.height) * 100
    newX = Math.max(0, Math.min(100, newX))
    newY = Math.max(0, Math.min(100, newY))
    setFields(prev => prev.map(f => f.id === id ? { ...f, x: newX, y: newY } : f))
  }

  const handlePointerUp = (e: React.PointerEvent, _id: string) => {
    setActiveFieldId(null)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const handleSizeChange = (id: string, val: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, size: Number(val) } : f))
  }
  
  const handleColorChange = (id: string, val: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, color: val } : f))
  }
  
  const handleLabelChange = (id: string, val: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, label: val } : f))
  }

  const toggleVisibility = (id: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, isVisible: !f.isVisible } : f))
  }
  
  const addField = () => {
    const newField: DraggableField = {
      id: `field_${Date.now()}`,
      type: 'STATIC',
      label: 'New Text',
      x: 50, y: 50, size: 16, isVisible: true, color: '#000000'
    }
    setFields(prev => [...prev, newField])
  }
  
  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }
  
  const handleTypeChange = (id: string, val: string) => {
    const newLabel = FIELD_TYPES.find(t => t.value === val)?.label || 'New Text'
    setFields(prev => prev.map(f => f.id === id ? { ...f, type: val, label: val === 'STATIC' ? f.label : newLabel } : f))
  }

  const handlePreview = () => {
    import('@/lib/utils/pdf').then(({ generateCertificatePDF }) => {
      generateCertificatePDF({
        studentName: 'JOHN DOE SMITH',
        jambRegNo: '12345678AB',
        matricNo: '19/CS/1234',
        faculty: 'Faculty of Science',
        department: 'Computer Science',
        universityName: campaign.university?.name || 'Test University',
        primaryColor: campaign.university?.primaryColor || '#1B4F72',
        campaignName: campaign.name || 'Clearance Campaign',
        completedAt: '12/12/2026',
        clearanceNumber: 'CLR-2026-0001',
        templateUrl: campaign.customCertificateUrl,
        coordinates: { fields, hideDefaultText } as any
      })
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-4 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">Visual Designer</h2>
          <div className="flex gap-2">
            {campaign.customCertificateUrl && (
              <Button 
                variant="danger" 
                size="sm" 
                onClick={() => campaignsApi.update(campaign.id, { customCertificateUrl: null }).then(() => {
                  toast.success('Template removed')
                  qc.invalidateQueries({ queryKey: ['campaigns'] })
                  router.refresh()
                })}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Remove Template
              </Button>
            )}
            {!campaign.customCertificateUrl && !hideDefaultText && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => {
                  setHideDefaultText(true)
                  setFields([
                    { id: 'campaign', type: 'CAMPAIGN_NAME', label: 'Campaign Name', x: 50, y: 86.6, size: 24, isVisible: true, color: campaign.university?.primaryColor || '#1B4F72' },
                    { id: 'uni', type: 'UNIVERSITY_NAME', label: 'University Name', x: 50, y: 78, size: 24, isVisible: true, color: '#000000' },
                    { id: 'title', type: 'STATIC', label: 'CLEARANCE CERTIFICATE', x: 50, y: 70, size: 20, isVisible: true, color: '#000000' },
                    { id: 'certify', type: 'STATIC', label: 'This is to certify that', x: 50, y: 60, size: 14, isVisible: true, color: '#4b5563' },
                    { id: 'name', type: 'STUDENT_NAME', label: 'Student Name', x: 50, y: 47.5, size: 28, isVisible: true, color: '#000000' },
                    { id: 'jamb', type: 'JAMB_REG_NO', label: 'JAMB Reg No', x: 50, y: 35, size: 14, isVisible: true, color: '#333333' },
                    { id: 'footer', type: 'STATIC', label: 'has satisfactorily completed all requirements for final clearance.', x: 50, y: 22, size: 14, isVisible: true, color: '#4b5563' },
                    { id: 'date', type: 'DATE', label: 'Date of Issue', x: 50, y: 12, size: 12, isVisible: true, color: '#666666' },
                  ])
                }}
              >
                Make Background Editable
              </Button>
            )}
            <Button variant="secondary" size="sm" loading={uploadingCert} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Upload Template
            </Button>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCert(f) }} />
        </div>
        
        <div 
          ref={containerRef}
          className="relative w-full aspect-[1.5] bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden flex items-center justify-center select-none"
          style={{
            containerType: 'inline-size',
            backgroundImage: campaign.customCertificateUrl ? `url(${campaign.customCertificateUrl})` : 'none',
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {!campaign.customCertificateUrl && (
            <div 
              className="absolute inset-0 bg-white pointer-events-none flex flex-col items-center select-none overflow-hidden"
              style={{ color: campaign.university?.primaryColor || '#1B4F72' }}
            >
              {/* Outer Border (4px) */}
              <div 
                className="absolute inset-[3.33%] border-[4px]" 
                style={{ borderColor: campaign.university?.primaryColor || '#1B4F72' }}
              />
              {/* Inner Border (1px) */}
              <div 
                className="absolute inset-[4.16%] border" 
                style={{ borderColor: campaign.university?.primaryColor || '#1B4F72' }}
              />
              
              {!hideDefaultText && (
                <>
                  <div className="mt-[13.33%] text-2xl font-bold text-center px-8">{campaign.name || 'Clearance Campaign'}</div>
                  <div className="mt-[2%] text-2xl font-bold">{campaign.university?.name || 'Test University'}</div>
                  <div className="mt-[5%] text-xl font-bold text-black">CLEARANCE CERTIFICATE</div>
                  <div className="mt-[5%] text-sm text-gray-700">This is to certify that</div>
                  
                  <div className="mt-[22%] text-sm text-gray-700">has satisfactorily completed all requirements for final clearance.</div>
                </>
              )}
            </div>
          )}
          
          {fields.filter(f => f.isVisible).map(field => {
            let mockText = field.label
            let isBold = false
            switch (field.type) {
              case 'STUDENT_NAME': mockText = 'JOHN DOE SMITH'; isBold = true; break
              case 'CAMPAIGN_NAME': mockText = (campaign.name || 'Clearance Campaign').toUpperCase(); isBold = true; break
              case 'UNIVERSITY_NAME': mockText = campaign.university?.name || 'Test University'; isBold = true; break
              case 'CLEARANCE_NUMBER': mockText = 'No: CLR-2026-0001'; isBold = true; break
              case 'JAMB_REG_NO': mockText = 'JAMB Reg Number: 12345678AB'; isBold = true; break
              case 'MATRIC_NO': mockText = 'Matric Number: 19/CS/1234'; isBold = true; break
              case 'FACULTY': mockText = 'Faculty: Faculty of Science'; break
              case 'DEPARTMENT': mockText = 'Department: Computer Science'; break
              case 'DATE': mockText = 'Date of Issue: 12/12/2026'; break
            }

            return (
              <div
                key={field.id}
                className="absolute transform -translate-x-1/2 translate-y-1/2 cursor-move group whitespace-nowrap leading-none"
                style={{
                  left: `${field.x}%`,
                  bottom: `${field.y}%`,
                  fontSize: `${(field.size / 600) * 100}cqw`,
                  color: field.color,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontFamily: 'Helvetica, Arial, sans-serif'
                }}
                onPointerDown={(e) => handlePointerDown(e, field.id)}
                onPointerMove={(e) => handlePointerMove(e, field.id)}
                onPointerUp={(e) => handlePointerUp(e, field.id)}
              >
                <div className="relative group-hover:outline group-hover:outline-2 group-hover:outline-blue-400 group-hover:bg-blue-50/50 transition-all px-1 py-0.5 rounded cursor-grab active:cursor-grabbing">
                  {mockText}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity font-normal tracking-wide">
                    {field.label}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">Drag the blue labels to position the dynamic text on your certificate.</p>
      </Card>

      <Card className="flex flex-col max-h-[800px] overflow-hidden">
        <div className="flex items-center justify-between border-b p-4 bg-white z-10">
          <h2 className="font-semibold text-lg">Coordinate Settings</h2>
          <Button variant="secondary" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" /> Add Field
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
          {fields.map(field => (
              <div key={field.id} className={`space-y-3 p-3 rounded border ${field.isVisible ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1 w-3/4">
                    <select
                      value={field.type}
                      onChange={e => handleTypeChange(field.id, e.target.value)}
                      className="text-xs font-semibold uppercase tracking-wider text-blue-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
                    >
                      {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    
                    {field.type === 'STATIC' ? (
                      <Input 
                        value={field.label} 
                        onChange={(e) => handleLabelChange(field.id, e.target.value)} 
                        className="h-8 font-medium text-sm border-transparent hover:border-gray-300 focus:border-blue-500 transition-colors bg-white shadow-sm" 
                        placeholder="Custom Text" 
                      />
                    ) : (
                      <div className="font-medium text-sm text-gray-800">{field.label}</div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => toggleVisibility(field.id)} 
                      className="text-gray-500 hover:text-blue-600 transition-colors p-1.5"
                      title={field.isVisible ? 'Hide field on certificate' : 'Show field on certificate'}
                    >
                      {field.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => removeField(field.id)} 
                      className="text-red-400 hover:text-red-600 transition-colors p-1.5"
                      title="Delete field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {field.isVisible && (
                  <>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <Input label="Font Size" type="number" value={field.size} onChange={(e) => handleSizeChange(field.id, e.target.value)} />
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">Color</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="color" 
                            value={field.color} 
                            onChange={(e) => handleColorChange(field.id, e.target.value)}
                            className="h-9 w-12 cursor-pointer bg-transparent border-0 p-0" 
                          />
                          <span className="text-xs text-gray-500 uppercase">{field.color}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {!field.isVisible && <p className="text-xs text-gray-500 italic">This field will not be printed.</p>}
              </div>
            ))}
          {/* The end of fields mapping */}
        </div>
        
        <div className="p-4 border-t flex flex-col gap-3 bg-white z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="secondary" onClick={handlePreview} className="w-full"><Eye className="h-4 w-4 mr-2" /> Download Preview</Button>
          <Button loading={savingCoords} onClick={() => saveCoords()} className="w-full"><Save className="h-4 w-4 mr-2" /> Save Coordinates</Button>
        </div>
      </Card>
    </div>
  )
}
