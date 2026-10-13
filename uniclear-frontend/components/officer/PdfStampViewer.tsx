'use client'

import React, { useState, useEffect, useRef } from 'react'
import { PDFDocument } from 'pdf-lib'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import { Button } from '@/components/ui/button'
import { OfficerStamp, officerStampsApi } from '@/lib/api/officerStamps.api'
import { StampManagerDialog } from './StampManagerDialog'
import Image from 'next/image'
import { toast } from 'sonner'

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
  
  // To track where the stamp is placed
  const [stampPosition, setStampPosition] = useState<{ x: number, y: number } | null>(null)
  const pageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    officerStampsApi.getAll().then((res) => {
      setStamps(res.data.data)
    }).catch(e => console.error("Could not load stamps", e))
  }, [])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
  }

  // When clicking on the PDF Canvas
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
      
      // 1. Fetch original PDF
      const existingPdfBytes = await fetch(fileUrl).then(res => res.arrayBuffer())
      const pdfDoc = await PDFDocument.load(existingPdfBytes)

      // 2. Fetch Stamp Image
      const stampBytes = await fetch(selectedStamp.imageUrl).then(res => res.arrayBuffer())
      
      let stampImage
      try {
        stampImage = await pdfDoc.embedPng(stampBytes)
      } catch (e) {
        stampImage = await pdfDoc.embedJpg(stampBytes)
      }

      // 3. Get the correct page
      const pages = pdfDoc.getPages()
      const currentPage = pages[pageNumber - 1]
      const { width, height } = currentPage.getSize()

      // Calculate stamp dimensions (scale down if necessary)
      const stampDims = stampImage.scale(0.3) // Scale down to 30%

      // 4. Draw Image
      currentPage.drawImage(stampImage, {
        x: stampPosition.x * width - (stampDims.width / 2),
        y: stampPosition.y * height - (stampDims.height / 2),
        width: stampDims.width,
        height: stampDims.height,
      })

      // 5. Serialize PDF to bytes (a Uint8Array)
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
      const file = new File([blob], 'signed_document.pdf', { type: 'application/pdf' })

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
      <div className="bg-[var(--color-bg)] border-b border-[var(--color-border)] p-3 flex items-center gap-4 overflow-x-auto shrink-0">
        <span className="text-xs font-semibold uppercase text-[var(--color-muted)] shrink-0">Your Stamps:</span>
        {stamps.length === 0 ? (
          <span className="text-sm text-[var(--color-muted)]">No stamps uploaded yet. Go to settings to add stamps!</span>
        ) : (
          stamps.map(stamp => (
            <button
              key={stamp.id}
              onClick={() => {
                setSelectedStamp(stamp)
                onStampSelect?.(stamp)
              }}
              className={`relative h-10 w-24 shrink-0 rounded border-2 transition-all overflow-hidden bg-white ${
                selectedStamp?.id === stamp.id ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-opacity-50' : 'border-[var(--color-border)] hover:border-gray-400'
              }`}
            >
              <Image src={stamp.imageUrl} alt={stamp.name} fill className="object-contain" />
            </button>
          ))
        )}
        <StampManagerDialog stamps={stamps} onStampsChange={setStamps} />
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center items-start p-4 relative">
        {selectedStamp && !stampPosition && (
          <div className="absolute top-6 z-10 bg-black text-white px-4 py-2 rounded-full text-sm shadow-xl pointer-events-none animate-pulse">
            Click anywhere on the document to drop your stamp
          </div>
        )}

        <div 
          ref={pageRef} 
          className="relative bg-white shadow-xl"
        >
          <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page 
              pageNumber={pageNumber} 
              width={600}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

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
              className="absolute pointer-events-none opacity-80 shadow-md border border-blue-400 rounded bg-white z-20"
              style={{
                left: `${stampPosition.x * 100}%`,
                bottom: `${stampPosition.y * 100}%`,
                transform: 'translate(-50%, 50%)',
                width: '120px',
                height: '40px'
              }}
            >
               <Image src={selectedStamp.imageUrl} alt="preview" fill className="object-contain p-1" />
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-bg)] border-t border-[var(--color-border)] p-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} variant="secondary" size="sm">Prev Page</Button>
          <span className="text-sm font-medium">Page {pageNumber} of {numPages || '--'}</span>
          <Button disabled={pageNumber >= (numPages || 1)} onClick={() => setPageNumber(p => p + 1)} variant="secondary" size="sm">Next Page</Button>
        </div>
        
        {stampPosition && (
          <Button onClick={handleApplyStamp}>
            ✓ Lock & Save Stamp
          </Button>
        )}
      </div>
    </div>
  )
}
