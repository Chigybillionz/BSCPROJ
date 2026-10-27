'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { OfficerStamp, officerStampsApi } from '@/lib/api/officerStamps.api'
import { StampManagerDialog } from './StampManagerDialog'
import { toast } from 'sonner'

import { normalizeDocUrl } from '@/lib/utils/format'
import { Sparkles, MapPin, Check } from 'lucide-react'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface PdfStampViewerProps {
  fileUrl: string
  onSaveStampedFile: (file: File) => void
  onStampSelect?: (stamp: OfficerStamp | null) => void
}

export function PdfStampViewer({ fileUrl, onSaveStampedFile, onStampSelect }: PdfStampViewerProps) {
  const [numPages, setNumPages] = useState<number>()
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [stamps, setStamps] = useState<OfficerStamp[]>([])
  const [selectedStamp, setSelectedStamp] = useState<OfficerStamp | null>(null)
  
  const isImage = /\.(jpe?g|png|webp)($|\?)/i.test(fileUrl)

  // Track where the stamp is placed
  const [stampPosition, setStampPosition] = useState<{ x: number, y: number } | null>(null)
  const [savedPosition, setSavedPosition] = useState<{ x: number, y: number } | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const p = localStorage.getItem('uniclear_last_stamp_pos')
      return p ? JSON.parse(p) : null
    } catch {
      return null
    }
  })
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    officerStampsApi.getAll().then((res) => {
      const stampList = res.data.data || []
      setStamps(stampList)
      if (stampList.length > 0) {
        const savedStampId = typeof window !== 'undefined' ? localStorage.getItem('uniclear_default_stamp_id') : null
        const match = stampList.find(s => s.id === savedStampId) || stampList[0]
        if (match) {
          setSelectedStamp(match)
          onStampSelect?.(match)
        }
      }
    }).catch(e => console.error("Could not load stamps", e))
  }, [])

  const handleSelectStamp = (stamp: OfficerStamp) => {
    setSelectedStamp(stamp)
    onStampSelect?.(stamp)
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniclear_default_stamp_id', stamp.id)
    }
  }

  const handleSetPosition = (pos: { x: number; y: number }) => {
    setStampPosition(pos)
    if (typeof window !== 'undefined') {
      localStorage.setItem('uniclear_last_stamp_pos', JSON.stringify(pos))
      setSavedPosition(pos)
    }
  }


  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  // When clicking on the Document Canvas
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedStamp || !pageRef.current) return
    const rect = pageRef.current.getBoundingClientRect()
    // Calculate percentage coordinates (0 to 1) from the bottom-left to match PDF coordinates
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - ((e.clientY - rect.top) / rect.height)
    
    setStampPosition({ x, y })
  }

  const handleApplyStamp = async () => {
    if (!selectedStamp || !stampPosition) {
      toast.error('Please select a stamp and click on the document to place it.')
      return
    }

    try {
      toast.loading('Baking stamp into document...', { id: 'stamp' })
      
      const fileBytes = await fetch(fileUrl).then(res => res.arrayBuffer())
      let pdfDoc: PDFDocument
      let currentPage: any
      let width: number
      let height: number

      if (isImage) {
        pdfDoc = await PDFDocument.create()
        let docImage
        try {
          docImage = await pdfDoc.embedPng(fileBytes)
        } catch {
          docImage = await pdfDoc.embedJpg(fileBytes)
        }
        currentPage = pdfDoc.addPage([docImage.width, docImage.height])
        width = docImage.width
        height = docImage.height
        currentPage.drawImage(docImage, { x: 0, y: 0, width, height })
      } else {
        pdfDoc = await PDFDocument.load(fileBytes)
        const pages = pdfDoc.getPages()
        currentPage = pages[pageNumber - 1]
        const size = currentPage.getSize()
        width = size.width
        height = size.height
      }

      // 2. Fetch Stamp Image
      const stampBytes = await fetch(selectedStamp.imageUrl).then(res => res.arrayBuffer())
      
      let stampImage
      try {
        stampImage = await pdfDoc.embedPng(stampBytes)
      } catch {
        stampImage = await pdfDoc.embedJpg(stampBytes)
      }

      // Calculate stamp dimensions (scale down if necessary)
      const stampDims = stampImage.scale(0.3) // Scale down to 30%

      // 3. Draw Image
      currentPage.drawImage(stampImage, {
        x: stampPosition.x * width - (stampDims.width / 2),
        y: stampPosition.y * height - (stampDims.height / 2),
        width: stampDims.width,
        height: stampDims.height,
      })

      // 4. Serialize PDF to bytes (a Uint8Array)
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
      const file = new File([blob], 'signed_document.pdf', { type: 'application/pdf' })

      if (typeof window !== 'undefined' && stampPosition) {
        localStorage.setItem('uniclear_last_stamp_pos', JSON.stringify(stampPosition))
        setSavedPosition(stampPosition)
      }

      toast.success('Document successfully stamped!', { id: 'stamp' })
      onSaveStampedFile(file)
    } catch (err) {
      console.error(err)
      toast.error('Failed to stamp document', { id: 'stamp' })
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Stamp Toolbar */}
      <div className="bg-[var(--color-bg)] border-b border-[var(--color-border)] p-3 flex items-center gap-3 overflow-x-auto shrink-0">
        <span className="text-xs font-semibold uppercase text-[var(--color-muted)] shrink-0">Your Stamps:</span>
        {stamps.length === 0 ? (
          <span className="text-xs text-[var(--color-muted)]">No stamps uploaded yet. Add stamps below to sign documents!</span>
        ) : (
          stamps.map(stamp => (
            <button
              key={stamp.id}
              type="button"
              onClick={() => handleSelectStamp(stamp)}
              className={`relative h-10 w-24 shrink-0 rounded border-2 transition-all overflow-hidden bg-white cursor-pointer ${
                selectedStamp?.id === stamp.id ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-opacity-50' : 'border-[var(--color-border)] hover:border-gray-400'
              }`}
              title={stamp.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={normalizeDocUrl(stamp.imageUrl)} alt={stamp.name} className="w-full h-full object-contain p-0.5" />
            </button>
          ))
        )}
        <StampManagerDialog stamps={stamps} onStampsChange={setStamps} />

        {/* Quick Position Helpers */}
        {selectedStamp && (
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {savedPosition && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleSetPosition(savedPosition)}
                className="h-8 px-2.5 text-xs font-semibold bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                title="Place stamp at the exact position used previously"
              >
                <MapPin className="h-3 w-3 text-blue-600" />
                <span>Use Last Position</span>
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleSetPosition({ x: 0.82, y: 0.15 })}
              className="h-8 px-2.5 text-xs font-semibold border-slate-200 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
              title="Standard bottom-right certificate endorsement position"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Bottom-Right Seal</span>
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center items-start p-4 relative">
        {selectedStamp && !stampPosition && (
          <div className="absolute top-4 z-20 bg-slate-900/95 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-xl flex items-center gap-3 backdrop-blur-sm border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span>Click document to drop stamp, or use preset:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {savedPosition && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleSetPosition(savedPosition) }}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <MapPin className="h-3 w-3" />
                  <span>Last Position</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSetPosition({ x: 0.82, y: 0.15 }) }}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Bottom-Right Seal</span>
              </button>
            </div>
          </div>
        )}

        <div 
          ref={pageRef} 
          className="relative bg-white shadow-xl"
        >
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img 
              src={fileUrl} 
              alt="Document Preview" 
              className="w-[600px] h-auto object-contain block select-none pointer-events-none" 
            />
          ) : (
            <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
              <Page 
                pageNumber={pageNumber} 
                width={600}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          )}

          {/* Transparent overlay to capture stamp placement clicks */}
          {selectedStamp && (
            <div
              className="absolute inset-0 cursor-crosshair z-10"
              onClick={handlePageClick}
            />
          )}

          {/* Visual preview of where stamp will be placed */}
          {stampPosition && selectedStamp && (
            <div 
              className="absolute pointer-events-none opacity-90 shadow-lg border-2 border-blue-500 rounded-lg bg-white/95 z-20 flex items-center justify-center p-1"
              style={{
                left: `${stampPosition.x * 100}%`,
                bottom: `${stampPosition.y * 100}%`,
                transform: 'translate(-50%, 50%)',
                width: '120px',
                height: '48px'
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={normalizeDocUrl(selectedStamp.imageUrl)} alt="preview" className="w-full h-full object-contain" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          {!isImage ? (
            <>
              <Button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} variant="secondary" size="sm">Prev Page</Button>
              <span className="text-sm font-medium">Page {pageNumber} of {numPages || '--'}</span>
              <Button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(p => p + 1)} variant="secondary" size="sm">Next Page</Button>
            </>
          ) : (
            <span className="text-sm font-medium text-[var(--color-muted)]">Image Document (1 page)</span>
          )}
        </div>
        
        {stampPosition && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setStampPosition(null)}
              className="text-xs h-9 cursor-pointer"
            >
              Clear Placement
            </Button>
            <Button onClick={handleApplyStamp} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer shadow-xs">
              <Check className="h-4 w-4" />
              <span>Apply & Save Stamp</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
