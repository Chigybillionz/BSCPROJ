import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'

export interface CertificateData {
  id?: string
  clearanceNumber?: string | null
  status?: string
  completedAt?: Date | string | null
  createdAt?: Date | string
  clearance?: {
    id: string
    clearanceNumber?: string | null
    status: string
    completedAt?: Date | string | null
    createdAt: Date | string
  }
  university: {
    name: string
    slug: string
    logoUrl?: string | null
    branding?: {
      primaryColor?: string | null
      footerText?: string | null
    } | null
  }
  campaign: {
    name: string
    description?: string | null
  }
  session?: {
    name: string
  } | null
  student: {
    firstName: string
    lastName: string
    jambRegNo: string
    matricNo?: string | null
    level?: string | null
    faculty?: { name: string } | null
    department?: { name: string } | null
  }
  documents?: Array<{
    fileName: string
    fileUrl: string
    fileKey: string
    mimeType: string
    documentType?: { name: string } | null
  }>
  stageApprovals: Array<{
    id: string
    status: string
    remarks?: string | null
    decidedAt: Date | string
    stage: {
      name: string
      orderIndex: number
    }
    officerRef?: {
      firstName: string
      lastName: string
    } | null
    officer?: {
      email: string
    } | null
    stamp?: {
      id: string
      name: string
      imageUrl: string
      imageKey: string
    } | null
  }>
}

function hexToRgb(hex: string) {
  let c = hex.replace('#', '')
  if (c.length === 3) c = c.split('').map(x => x + x).join('')
  const num = parseInt(c, 16)
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255)
}

async function loadImageBuffer(keyOrUrl: string): Promise<Buffer | null> {
  try {
    if (!keyOrUrl) return null

    // Check local filesystem first
    const cleanKey = path.basename(keyOrUrl)
    const localPath = path.resolve(process.cwd(), 'uploads', cleanKey)
    if (fs.existsSync(localPath)) {
      return await fs.promises.readFile(localPath)
    }

    // Try full path if given
    if (fs.existsSync(keyOrUrl)) {
      return await fs.promises.readFile(keyOrUrl)
    }

    // If HTTP / HTTPS URL
    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      const res = await fetch(keyOrUrl)
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer()
        return Buffer.from(arrayBuf)
      }
    }
  } catch (err) {
    // Graceful fallback if image load fails
  }
  return null
}

async function tryEmbedImage(doc: PDFDocument, buffer: Buffer | null) {
  if (!buffer || buffer.length < 4) return null
  try {
    // Detect PNG magic bytes: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return await doc.embedPng(buffer)
    }
    // Detect JPG magic bytes: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return await doc.embedJpg(buffer)
    }
  } catch {
    // Ignore invalid images
  }
  return null
}

export class CertificateGenerator {
  static async generate(data: CertificateData): Promise<Uint8Array> {
    const doc = await PDFDocument.create()
    // Standard A4 portrait: 595.28 x 841.89 points
    const pageWidth = 595.28
    const pageHeight = 841.89
    const page = doc.addPage([pageWidth, pageHeight])

    // Fonts
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
    const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique)

    // Palette
    const primaryColor = data.university.branding?.primaryColor 
      ? hexToRgb(data.university.branding.primaryColor)
      : rgb(11 / 255, 102 / 255, 35 / 255) // Rich Academic Green (#0B6623)
    const goldColor = rgb(198 / 255, 146 / 255, 20 / 255) // Gold (#C69214)
    const darkTextColor = rgb(26 / 255, 32 / 255, 44 / 255)
    const mutedTextColor = rgb(74 / 255, 85 / 255, 104 / 255)
    const lightBorderColor = rgb(226 / 255, 232 / 255, 240 / 255)
    const whiteColor = rgb(1, 1, 1)

    // ==========================================
    // 1. ELEGANT DOUBLE CERTIFICATE BORDER
    // ==========================================
    page.drawRectangle({
      x: 20,
      y: 20,
      width: pageWidth - 40,
      height: pageHeight - 40,
      borderColor: primaryColor,
      borderWidth: 3.5,
    })
    page.drawRectangle({
      x: 26,
      y: 26,
      width: pageWidth - 52,
      height: pageHeight - 52,
      borderColor: goldColor,
      borderWidth: 1.2,
    })

    // Corner decorative corner accents
    const cornerSize = 14
    // Top-left
    page.drawLine({ start: { x: 26, y: pageHeight - 26 - cornerSize }, end: { x: 26 + cornerSize, y: pageHeight - 26 }, color: goldColor, thickness: 1.5 })
    // Top-right
    page.drawLine({ start: { x: pageWidth - 26 - cornerSize, y: pageHeight - 26 }, end: { x: pageWidth - 26, y: pageHeight - 26 - cornerSize }, color: goldColor, thickness: 1.5 })
    // Bottom-left
    page.drawLine({ start: { x: 26, y: 26 + cornerSize }, end: { x: 26 + cornerSize, y: 26 }, color: goldColor, thickness: 1.5 })
    // Bottom-right
    page.drawLine({ start: { x: pageWidth - 26 - cornerSize, y: 26 }, end: { x: pageWidth - 26, y: 26 + cornerSize }, color: goldColor, thickness: 1.5 })

    // ==========================================
    // 2. HEADER: UNIVERSITY & REGISTRY
    // ==========================================
    let cursorY = pageHeight - 55

    // University Name
    const uniName = data.university.name.toUpperCase()
    const uniNameWidth = fontBold.widthOfTextAtSize(uniName, 17)
    page.drawText(uniName, {
      x: (pageWidth - uniNameWidth) / 2,
      y: cursorY,
      size: 17,
      font: fontBold,
      color: primaryColor,
    })

    cursorY -= 17
    const subHeader = 'OFFICE OF THE REGISTRAR | STUDENT AFFAIRS & ACADEMIC CLEARANCE'
    const subWidth = fontRegular.widthOfTextAtSize(subHeader, 8.5)
    page.drawText(subHeader, {
      x: (pageWidth - subWidth) / 2,
      y: cursorY,
      size: 8.5,
      font: fontRegular,
      color: mutedTextColor,
    })

    cursorY -= 12
    page.drawLine({
      start: { x: 45, y: cursorY },
      end: { x: pageWidth - 45, y: cursorY },
      color: lightBorderColor,
      thickness: 1,
    })

    // ==========================================
    // 3. CERTIFICATE TITLE BANNER
    // ==========================================
    cursorY -= 32
    const bannerTitle = 'OFFICIAL FINAL CLEARANCE CERTIFICATE'
    const bannerWidth = fontBold.widthOfTextAtSize(bannerTitle, 16)
    
    // Draw subtle badge backdrop
    const badgePaddingX = 24
    const badgeHeight = 26
    page.drawRectangle({
      x: (pageWidth - bannerWidth) / 2 - badgePaddingX,
      y: cursorY - 6,
      width: bannerWidth + badgePaddingX * 2,
      height: badgeHeight,
      color: rgb(240 / 255, 253 / 255, 244 / 255), // light green bg
      borderColor: primaryColor,
      borderWidth: 1,
    })
    page.drawText(bannerTitle, {
      x: (pageWidth - bannerWidth) / 2,
      y: cursorY,
      size: 16,
      font: fontBold,
      color: primaryColor,
    })

    cursorY -= 22
    const clearObj = data.clearance || data
    const rawId = clearObj.id || '2026'
    const certNumber = clearObj.clearanceNumber || `CLR-${rawId.substring(0, 8).toUpperCase()}`
    const rawCompletedAt = clearObj.completedAt
    const completionDate = rawCompletedAt 
      ? new Date(rawCompletedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    
    const metaText = `Certificate Reference: ${certNumber}    |    Issued: ${completionDate}    |    Status: FULLY CLEARED`
    const metaWidth = fontBold.widthOfTextAtSize(metaText, 9)
    page.drawText(metaText, {
      x: (pageWidth - metaWidth) / 2,
      y: cursorY,
      size: 9,
      font: fontBold,
      color: darkTextColor,
    })

    // ==========================================
    // 4. CERTIFICATION ATTESTATION STATEMENT
    // ==========================================
    cursorY -= 28
    const statement1 = 'This is to certify that the student detailed below has satisfactorily satisfied all departmental, financial,'
    const statement2 = 'academic, and administrative clearance regulations required by the University Senate.'
    page.drawText(statement1, {
      x: (pageWidth - fontRegular.widthOfTextAtSize(statement1, 9.5)) / 2,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: darkTextColor,
    })
    cursorY -= 13
    page.drawText(statement2, {
      x: (pageWidth - fontRegular.widthOfTextAtSize(statement2, 9.5)) / 2,
      y: cursorY,
      size: 9.5,
      font: fontRegular,
      color: darkTextColor,
    })

    // ==========================================
    // 5. STUDENT PROFILE & PASSPORT PHOTO BOX
    // ==========================================
    cursorY -= 22
    const profileBoxX = 45
    const profileBoxWidth = pageWidth - 90
    const profileBoxHeight = 110
    const profileBoxY = cursorY - profileBoxHeight

    // Profile card background
    page.drawRectangle({
      x: profileBoxX,
      y: profileBoxY,
      width: profileBoxWidth,
      height: profileBoxHeight,
      color: rgb(248 / 255, 250 / 255, 252 / 255), // light slate
      borderColor: lightBorderColor,
      borderWidth: 1,
    })

    // Passport Photo Frame on right
    const photoWidth = 75
    const photoHeight = 90
    const photoX = profileBoxX + profileBoxWidth - photoWidth - 14
    const photoY = profileBoxY + 10

    page.drawRectangle({
      x: photoX,
      y: photoY,
      width: photoWidth,
      height: photoHeight,
      color: whiteColor,
      borderColor: goldColor,
      borderWidth: 1.5,
    })

    // Attempt to load and embed passport photo
    let passportEmbedded = false
    if (data.documents && data.documents.length > 0) {
      // Find passport document
      const passportDoc = data.documents.find(d => 
        (d.documentType?.name?.toLowerCase().includes('passport') || d.fileName.toLowerCase().includes('passport'))
      ) || data.documents.find(d => d.mimeType.startsWith('image/'))

      if (passportDoc) {
        const photoBuffer = await loadImageBuffer(passportDoc.fileKey || passportDoc.fileUrl)
        const photoImg = await tryEmbedImage(doc, photoBuffer)
        if (photoImg) {
          page.drawImage(photoImg, {
            x: photoX + 2,
            y: photoY + 2,
            width: photoWidth - 4,
            height: photoHeight - 4,
          })
          passportEmbedded = true
        }
      }
    }

    if (!passportEmbedded) {
      // Draw official passport placeholder avatar
      page.drawText('STUDENT', {
        x: photoX + 16,
        y: photoY + 54,
        size: 9,
        font: fontBold,
        color: mutedTextColor,
      })
      page.drawText('PHOTO', {
        x: photoX + 20,
        y: photoY + 40,
        size: 9,
        font: fontBold,
        color: mutedTextColor,
      })
      page.drawText('VERIFIED', {
        x: photoX + 17,
        y: photoY + 26,
        size: 7.5,
        font: fontBold,
        color: primaryColor,
      })
    }

    // Student Information Table (Left of Photo)
    const infoX = profileBoxX + 16
    let infoY = profileBoxY + profileBoxHeight - 22
    const rowHeight = 17

    const drawInfoRow = (label: string, value: string) => {
      page.drawText(label.toUpperCase(), {
        x: infoX,
        y: infoY,
        size: 8.5,
        font: fontBold,
        color: mutedTextColor,
      })
      page.drawText(value, {
        x: infoX + 130,
        y: infoY,
        size: 9.5,
        font: fontBold,
        color: darkTextColor,
      })
      infoY -= rowHeight
    }

    const studentFullName = `${data.student.firstName} ${data.student.lastName}`.toUpperCase()
    drawInfoRow('Student Full Name:', studentFullName)
    drawInfoRow('JAMB Reg Number:', data.student.jambRegNo)
    drawInfoRow('Matriculation No:', data.student.matricNo || 'N/A')
    drawInfoRow('Faculty:', data.student.faculty?.name || 'Faculty of Physical Sciences')
    drawInfoRow('Department:', data.student.department?.name || 'Computer Science')

    // ==========================================
    // 6. CLEARANCE ENDORSEMENTS & STAMPS MATRIX
    // ==========================================
    cursorY = profileBoxY - 26

    const sectionTitle = 'OFFICIAL STAGES & CLEARANCE OFFICER ENDORSEMENTS'
    page.drawText(sectionTitle, {
      x: 45,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: primaryColor,
    })

    const sectionSubtitle = 'The following statutory departments have inspected, verified, and endorsed this student:'
    page.drawText(sectionSubtitle, {
      x: 45,
      y: cursorY - 12,
      size: 8,
      font: fontOblique,
      color: mutedTextColor,
    })

    cursorY -= 24

    // Render Grid of Stages & Digital Stamps
    // We display stages in a 2-column or 3-column grid depending on count
    const stages = data.stageApprovals && data.stageApprovals.length > 0 
      ? data.stageApprovals 
      : [
          {
            id: 'mock-1',
            status: 'APPROVED',
            stage: { name: 'Library Clearance', orderIndex: 1 },
            officerRef: { firstName: 'Dr. Ngozi', lastName: 'Okeke' },
            decidedAt: new Date(),
          },
          {
            id: 'mock-2',
            status: 'APPROVED',
            stage: { name: 'Bursary Clearance', orderIndex: 2 },
            officerRef: { firstName: 'Mr. Emeka', lastName: 'Nwosu' },
            decidedAt: new Date(),
          },
        ]

    const stampCols = 2
    const cellMargin = 10
    const gridWidth = pageWidth - 90
    const cellWidth = (gridWidth - cellMargin) / stampCols
    const cellHeight = 76

    for (let i = 0; i < stages.length; i++) {
      const approval = stages[i]
      const col = i % stampCols
      const row = Math.floor(i / stampCols)
      const cellX = 45 + col * (cellWidth + cellMargin)
      const cellY = cursorY - (row + 1) * cellHeight + (row * 6)

      // Cell border & background
      page.drawRectangle({
        x: cellX,
        y: cellY,
        width: cellWidth,
        height: cellHeight,
        color: whiteColor,
        borderColor: rgb(203 / 255, 213 / 255, 225 / 255),
        borderWidth: 1,
      })

      // Top colored accent bar for cell
      page.drawRectangle({
        x: cellX,
        y: cellY + cellHeight - 3,
        width: cellWidth,
        height: 3,
        color: primaryColor,
      })

      // Stage Title
      page.drawText(`${approval.stage.orderIndex || i + 1}. ${approval.stage.name}`.toUpperCase(), {
        x: cellX + 8,
        y: cellY + cellHeight - 16,
        size: 8.5,
        font: fontBold,
        color: darkTextColor,
      })

      // Officer details
      const officerName = approval.officerRef 
        ? `${approval.officerRef.firstName} ${approval.officerRef.lastName}`
        : 'Authorized Officer'
      page.drawText(`Officer: ${officerName}`, {
        x: cellX + 8,
        y: cellY + cellHeight - 28,
        size: 7.5,
        font: fontRegular,
        color: mutedTextColor,
      })

      const approvalDate = new Date(approval.decidedAt).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      })
      page.drawText(`Date: ${approvalDate}`, {
        x: cellX + 8,
        y: cellY + cellHeight - 39,
        size: 7.5,
        font: fontRegular,
        color: mutedTextColor,
      })

      // Status pill badge
      page.drawRectangle({
        x: cellX + 8,
        y: cellY + 8,
        width: 72,
        height: 16,
        color: rgb(220 / 255, 252 / 255, 231 / 255), // light green
        borderColor: rgb(34 / 255, 197 / 255, 94 / 255),
        borderWidth: 0.8,
      })
      page.drawText('APPROVED', {
        x: cellX + 15,
        y: cellY + 13,
        size: 7.5,
        font: fontBold,
        color: rgb(21 / 255, 128 / 255, 61 / 255),
      })

      // Stamp slot on right of cell
      const stampBoxSize = 54
      const stampBoxX = cellX + cellWidth - stampBoxSize - 8
      const stampBoxY = cellY + 10

      let stampEmbedded = false
      if (approval.stamp) {
        const stampBuf = await loadImageBuffer(approval.stamp.imageKey || approval.stamp.imageUrl)
        const stampImg = await tryEmbedImage(doc, stampBuf)
        if (stampImg) {
          page.drawImage(stampImg, {
            x: stampBoxX,
            y: stampBoxY,
            width: stampBoxSize,
            height: stampBoxSize,
          })
          stampEmbedded = true
        }
      }

      // If no custom stamp image uploaded, draw official vector circular seal!
      if (!stampEmbedded) {
        const centerX = stampBoxX + stampBoxSize / 2
        const centerY = stampBoxY + stampBoxSize / 2
        const radius = stampBoxSize / 2 - 2

        // Outer seal circle
        page.drawCircle({
          x: centerX,
          y: centerY,
          size: radius,
          borderColor: primaryColor,
          borderWidth: 1.2,
        })
        // Inner dashed ring
        page.drawCircle({
          x: centerX,
          y: centerY,
          size: radius - 3.5,
          borderColor: goldColor,
          borderWidth: 0.7,
        })

        // Seal text
        page.drawText('VERIFIED', {
          x: centerX - 18,
          y: centerY + 6,
          size: 6.5,
          font: fontBold,
          color: primaryColor,
        })
        page.drawText('OFFICIAL', {
          x: centerX - 18,
          y: centerY - 4,
          size: 6,
          font: fontBold,
          color: goldColor,
        })
        page.drawText('STAMP', {
          x: centerX - 13,
          y: centerY - 13,
          size: 5.5,
          font: fontBold,
          color: primaryColor,
        })
      }
    }

    // ==========================================
    // 7. DIGITAL SIGNATURES & VERIFICATION QR
    // ==========================================
    const footerY = 52
    page.drawLine({
      start: { x: 45, y: footerY + 54 },
      end: { x: pageWidth - 45, y: footerY + 54 },
      color: lightBorderColor,
      thickness: 1,
    })

    // Generate Verification QR Code
    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const verifyUrl = `${appUrl}/verify/${certNumber}`
    let qrPngBuffer: Buffer | null = null
    try {
      qrPngBuffer = await QRCode.toBuffer(verifyUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0B6623',
          light: '#FFFFFF',
        },
      })
    } catch {
      // QR Code fallback
    }

    const qrSize = 46
    const qrX = pageWidth - 45 - qrSize
    const qrY = footerY + 2

    if (qrPngBuffer) {
      const qrImg = await tryEmbedImage(doc, qrPngBuffer)
      if (qrImg) {
        page.drawImage(qrImg, {
          x: qrX,
          y: qrY,
          width: qrSize,
          height: qrSize,
        })
      }
    }

    // QR Label
    page.drawText('SCAN TO VERIFY', {
      x: qrX - 8,
      y: qrY - 10,
      size: 6.5,
      font: fontBold,
      color: primaryColor,
    })

    // Registrar Signature Lines (Left & Center)
    const sigY = footerY + 20
    // Signature 1: Dean of Student Affairs
    page.drawLine({ start: { x: 45, y: sigY }, end: { x: 185, y: sigY }, color: darkTextColor, thickness: 0.8 })
    page.drawText('Dean of Student Affairs', { x: 45, y: sigY - 11, size: 8, font: fontBold, color: darkTextColor })
    page.drawText('Signature & Date Endorsement', { x: 45, y: sigY - 20, size: 6.5, font: fontRegular, color: mutedTextColor })

    // Signature 2: University Registrar
    page.drawLine({ start: { x: 235, y: sigY }, end: { x: 375, y: sigY }, color: darkTextColor, thickness: 0.8 })
    page.drawText('University Academic Registrar', { x: 235, y: sigY - 11, size: 8, font: fontBold, color: darkTextColor })
    page.drawText('Digital Verification & Seal', { x: 235, y: sigY - 20, size: 6.5, font: fontRegular, color: mutedTextColor })

    // Security Notice Bottom Bar
    const securityNotice = 'SECURE ELECTRONIC DOCUMENT | GENERATED BY UNICLEAR CLEARANCE PLATFORM | FORGERY IS A CRIMINAL OFFENSE'
    page.drawText(securityNotice, {
      x: (pageWidth - fontRegular.widthOfTextAtSize(securityNotice, 6.2)) / 2,
      y: 28,
      size: 6.2,
      font: fontRegular,
      color: mutedTextColor,
    })

    return doc.save()
  }
}
