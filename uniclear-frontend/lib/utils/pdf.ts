import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export async function generateCertificatePDF(data: {
  studentName: string
  jambRegNo: string
  matricNo?: string
  faculty?: string
  department?: string
  universityName: string
  primaryColor?: string
  campaignName: string
  completedAt: string
  clearanceNumber?: string | null
  templateUrl?: string | null
  coordinates?: any
}) {
  let pdfDoc = await PDFDocument.create()
  let page: any
  let width: number
  let height: number

  const hexToRgb = (hex: string) => {
    if (!hex) return rgb(0, 0, 0)
    hex = hex.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    return rgb(r || 0, g || 0, b || 0)
  }

  async function drawDefaultTemplate(p: any, doc: PDFDocument, uniName: string) {
    const { width, height } = p.getSize()
    const primaryColor = hexToRgb(data.primaryColor || '#1B4F72')
    p.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: primaryColor, borderWidth: 4 })
    p.drawRectangle({ x: 25, y: 25, width: width - 50, height: height - 50, borderColor: primaryColor, borderWidth: 1 })
    
    if (!data.coordinates?.hideDefaultText) {
      const hBold = await doc.embedFont(StandardFonts.HelveticaBold)
      const hFont = await doc.embedFont(StandardFonts.Helvetica)
      p.drawText(uniName, { x: width / 2 - (hBold.widthOfTextAtSize(uniName, 24) / 2), y: height - 80, size: 24, font: hBold, color: primaryColor })
      const title = 'PHYSICAL SCIENCE CLEARANCE CERTIFICATE'
      p.drawText(title, { x: width / 2 - (hBold.widthOfTextAtSize(title, 20) / 2), y: height - 120, size: 20, font: hBold, color: rgb(0, 0, 0) })
      const text1 = 'This is to certify that'
      p.drawText(text1, { x: width / 2 - (hFont.widthOfTextAtSize(text1, 14) / 2), y: height - 160, size: 14, font: hFont, color: rgb(0.3, 0.3, 0.3) })
      const text2 = 'has satisfactorily completed all requirements for final clearance.'
      p.drawText(text2, { x: width / 2 - (hFont.widthOfTextAtSize(text2, 14) / 2), y: height - 250, size: 14, font: hFont, color: rgb(0.3, 0.3, 0.3) })
    }
  }

  if (data.templateUrl) {
    try {
      const templateBytes = await fetch(data.templateUrl, { mode: 'cors' }).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} - ${r.statusText}`)
        return r.arrayBuffer()
      })
      
      const bytes = new Uint8Array(templateBytes)
      
      // Detect magic numbers
      const isPdfMagic = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 // %PDF
      const isPngMagic = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 // \x89PNG
      const isJpgMagic = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff // JPG
      
      if (isPdfMagic) {
        pdfDoc = await PDFDocument.load(templateBytes)
        page = pdfDoc.getPages()[0]
        const size = page.getSize()
        width = size.width
        height = size.height
      } else {
        pdfDoc = await PDFDocument.create()
        let image
        if (isPngMagic) {
          image = await pdfDoc.embedPng(templateBytes)
        } else if (isJpgMagic) {
          image = await pdfDoc.embedJpg(templateBytes)
        } else {
          throw new Error('Unsupported image format (Not a valid PNG or JPG file)')
        }
        page = pdfDoc.addPage([image.width, image.height])
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height })
        width = image.width
        height = image.height
      }
    } catch (e: any) {
      console.error('Failed to load custom template:', e)
      if (typeof window !== 'undefined') {
        const errMsg = e && e.message ? e.message : (typeof e === 'string' ? e : JSON.stringify(e))
        alert('Failed to load template image: ' + errMsg)
      }
      throw e // Halt execution, do not fallback to default
    }
  } else {
    page = pdfDoc.addPage([600, 400])
    width = 600
    height = 400
    await drawDefaultTemplate(page, pdfDoc, data.universityName)
  }

  // Draw Dynamic Text
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const rawCoords = data.coordinates || {}
  let allFields: Array<{ type: string; label: string; text?: string; x: number; y: number; size: number; isVisible?: boolean; color?: string }> = []
  
  if (rawCoords.fields) {
    allFields = rawCoords.fields
  } else {
    // Migration from old schema
    const nameCoords = rawCoords.name ?? { x: 50, y: 47.5, size: 28, isVisible: true, color: '#000000' }
    const jambCoords = rawCoords.jamb ?? { x: 50, y: 27.5, size: 14, isVisible: true, color: '#333333' }
    const dateCoords = rawCoords.date ?? { x: 50, y: 15, size: 12, isVisible: true, color: '#666666' }
    const campaignCoords = rawCoords.campaign ?? { x: 50, y: 65, size: 20, isVisible: true, color: '#1a4b70' }
    const customFields = rawCoords.customFields ?? []
    
    allFields.push({ type: 'CAMPAIGN_NAME', label: 'Campaign Name', ...campaignCoords })
    allFields.push({ type: 'STUDENT_NAME', label: 'Student Name', ...nameCoords })
    allFields.push({ type: 'JAMB_REG_NO', label: 'JAMB Reg No', ...jambCoords })
    allFields.push({ type: 'DATE', label: 'Date of Issue', ...dateCoords })
    
    customFields.forEach((cf: any) => {
      allFields.push({ type: 'STATIC', label: cf.text, ...cf })
    })
  }

  const drawCenteredAtX = (text: string, font: any, size: number, xPercent: number, yPercent: number, colorHex?: string) => {
    if (!text) return
    const color = colorHex ? hexToRgb(colorHex) : rgb(0, 0, 0)
    const textWidth = font.widthOfTextAtSize(text, size)
    const x = (width * (xPercent / 100)) - (textWidth / 2)
    const y = height * (yPercent / 100)
    page.drawText(text, { x, y, size, font, color })
  }

  allFields.forEach(field => {
    if (field.isVisible === false) return

    let textToDraw = ''
    let useFont = fontRegular

    switch (field.type) {
      case 'STUDENT_NAME':
        textToDraw = data.studentName.toUpperCase()
        useFont = fontBold
        break
      case 'CAMPAIGN_NAME':
        textToDraw = data.campaignName.toUpperCase()
        useFont = fontBold
        break
      case 'UNIVERSITY_NAME':
        textToDraw = data.universityName
        useFont = fontBold
        break
      case 'CLEARANCE_NUMBER':
        textToDraw = data.clearanceNumber ? `No: ${data.clearanceNumber}` : ''
        useFont = fontBold
        break
      case 'JAMB_REG_NO':
        textToDraw = data.jambRegNo ? `JAMB Reg Number: ${data.jambRegNo}` : ''
        useFont = fontBold
        break
      case 'MATRIC_NO':
        textToDraw = data.matricNo ? `Matric Number: ${data.matricNo}` : ''
        useFont = fontBold
        break
      case 'FACULTY':
        textToDraw = data.faculty ? `Faculty: ${data.faculty}` : ''
        useFont = fontRegular
        break
      case 'DEPARTMENT':
        textToDraw = data.department ? `Department: ${data.department}` : ''
        useFont = fontRegular
        break
      case 'DATE':
        textToDraw = `Date of Issue: ${data.completedAt}`
        useFont = fontRegular
        break
      case 'STATIC':
      default:
        textToDraw = field.text || field.label
        useFont = fontRegular
        break
    }

    if (textToDraw) {
      drawCenteredAtX(textToDraw, useFont, field.size, field.x, field.y, field.color)
    }
  })

  // Serialize and download
  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Clearance_Certificate_${data.jambRegNo}.pdf`
  link.click()
}

export async function generateClearanceSlipPDF(data: {
  studentName: string
  jambRegNo: string
  universityName: string
  campaignName: string
  completedAt: string
  clearanceNumber?: string | null
  issuedData?: any | null
}) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([500, 350]) // Slightly taller to accommodate more data
  const { width, height } = page.getSize()

  const hBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const hFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const primaryColor = rgb(0.2, 0.2, 0.2)

  // Border
  page.drawRectangle({ x: 15, y: 15, width: width - 30, height: height - 30, borderColor: primaryColor, borderWidth: 2 })

  // Header
  const title = `${data.universityName} - Clearance Slip`
  page.drawText(title, { x: width / 2 - (hBold.widthOfTextAtSize(title, 16) / 2), y: height - 40, size: 16, font: hBold, color: rgb(0, 0, 0) })
  
  page.drawText(`Campaign: ${data.campaignName}`, { x: width / 2 - (hFont.widthOfTextAtSize(`Campaign: ${data.campaignName}`, 12) / 2), y: height - 65, size: 12, font: hFont, color: rgb(0.3, 0.3, 0.3) })

  if (data.clearanceNumber) {
    page.drawText(`No: ${data.clearanceNumber}`, { x: width - 150, y: height - 40, size: 10, font: hBold, color: rgb(0.6, 0.1, 0.1) })
  }

  // Details
  page.drawText(`Student Name: ${data.studentName}`, { x: 40, y: height - 110, size: 12, font: hFont, color: rgb(0, 0, 0) })
  page.drawText(`JAMB Reg No: ${data.jambRegNo}`, { x: 40, y: height - 135, size: 12, font: hFont, color: rgb(0, 0, 0) })
  page.drawText(`Status: CLEARED`, { x: 40, y: height - 160, size: 12, font: hBold, color: rgb(0.1, 0.6, 0.1) })
  page.drawText(`Date: ${data.completedAt}`, { x: 40, y: height - 185, size: 12, font: hFont, color: rgb(0.4, 0.4, 0.4) })

  // Custom Issued Data
  if (data.issuedData && Object.keys(data.issuedData).length > 0) {
    page.drawText(`Issued Details:`, { x: width / 2 + 20, y: height - 110, size: 12, font: hBold, color: rgb(0, 0, 0) })
    let currentY = height - 135
    for (const [key, value] of Object.entries(data.issuedData)) {
      page.drawText(`${key}: ${value}`, { x: width / 2 + 20, y: currentY, size: 12, font: hFont, color: rgb(0.2, 0.2, 0.2) })
      currentY -= 25
    }
  }

  // Footer note and verification reference
  if (data.clearanceNumber) {
    const verifyNote = `Verify authenticity at: /verify?number=${data.clearanceNumber}`
    page.drawText(verifyNote, { x: width / 2 - (hFont.widthOfTextAtSize(verifyNote, 9) / 2), y: 44, size: 9, font: hFont, color: rgb(0.1, 0.3, 0.5) })
  }

  const footer = 'This slip is computer generated and serves as official proof of clearance.'
  page.drawText(footer, { x: width / 2 - (hFont.widthOfTextAtSize(footer, 10) / 2), y: 28, size: 10, font: hFont, color: rgb(0.5, 0.5, 0.5) })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Clearance_Slip_${data.jambRegNo}.pdf`
  link.click()
}
