import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ClearanceSubmissionPanel } from '../ClearanceSubmissionPanel'
import type { ClearanceRequest, Document } from '@/types'

const mockOnUploadDocument = jest.fn()
const mockOnDeleteDocument = jest.fn()
const mockOnSubmitStage = jest.fn()

const baseRequest: ClearanceRequest = {
  id: 'req-1',
  studentId: 'stud-1',
  universityId: 'uni-1',
  sessionId: 'session-1',
  campaignId: 'camp-1',
  clearanceNumber: null,
  issuedData: null,
  status: 'IN_PROGRESS',
  stageStatus: 'PENDING',
  currentStageId: 'stage-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stageApprovals: [],
  documents: [],
  currentStage: {
    id: 'stage-1',
    name: 'Library Clearance',
    documentRequirements: [
      {
        id: 'req-1',
        documentTypeId: 'type-1',
        isRequired: true,
        documentType: { id: 'type-1', name: 'Library Card' }
      },
      {
        id: 'req-2',
        documentTypeId: 'type-2',
        isRequired: false,
        documentType: { id: 'type-2', name: 'Optional Overdue Fee Receipt' }
      }
    ]
  }
}

describe('ClearanceSubmissionPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders requirements and disables submit if required documents are missing', () => {
    render(
      <ClearanceSubmissionPanel
        request={baseRequest}
        documents={[]}
        onUploadDocument={mockOnUploadDocument}
        onDeleteDocument={mockOnDeleteDocument}
        onSubmitStage={mockOnSubmitStage}
      />
    )

    expect(screen.getByText('Stage: Library Clearance')).toBeInTheDocument()
    expect(screen.getByText('Library Card')).toBeInTheDocument()
    expect(screen.getByText('Optional Overdue Fee Receipt')).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Submit.*for Review/i })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit button when required documents are present', () => {
    const documents: Document[] = [
      {
        id: 'doc-1',
        documentTypeId: 'type-1',
        fileName: 'my_card.pdf',
        fileUrl: 'url',
        fileKey: 'key',
        fileSizeMB: 1,
        mimeType: 'application/pdf',
        status: 'PENDING',
        uploadedAt: new Date().toISOString(),
        documentType: { id: 'type-1', name: 'Library Card', description: null, isRequired: true, isActive: true, allowedFormats: [], maxFileSizeMB: 5 }
      }
    ]

    render(
      <ClearanceSubmissionPanel
        request={baseRequest}
        documents={documents}
        onUploadDocument={mockOnUploadDocument}
        onDeleteDocument={mockOnDeleteDocument}
        onSubmitStage={mockOnSubmitStage}
      />
    )

    expect(screen.getByText('my_card.pdf')).toBeInTheDocument()
    
    const submitBtn = screen.getByRole('button', { name: /Submit.*for Review/i })
    expect(submitBtn).not.toBeDisabled()
  })

  it('calls onUploadDocument when file is selected', async () => {
    render(
      <ClearanceSubmissionPanel
        request={baseRequest}
        documents={[]}
        onUploadDocument={mockOnUploadDocument}
        onDeleteDocument={mockOnDeleteDocument}
        onSubmitStage={mockOnSubmitStage}
      />
    )

    const fileInput = screen.getByTestId('file-input-type-1')
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(mockOnUploadDocument).toHaveBeenCalledWith(file, 'type-1')
    })
  })

  it('calls onDeleteDocument when delete is clicked', () => {
    const documents: Document[] = [
      {
        id: 'doc-1',
        documentTypeId: 'type-1',
        fileName: 'my_card.pdf',
        fileUrl: 'url',
        fileKey: 'key',
        fileSizeMB: 1,
        mimeType: 'application/pdf',
        status: 'PENDING',
        uploadedAt: new Date().toISOString(),
        documentType: { id: 'type-1', name: 'Library Card', description: null, isRequired: true, isActive: true, allowedFormats: [], maxFileSizeMB: 5 }
      }
    ]

    render(
      <ClearanceSubmissionPanel
        request={baseRequest}
        documents={documents}
        onUploadDocument={mockOnUploadDocument}
        onDeleteDocument={mockOnDeleteDocument}
        onSubmitStage={mockOnSubmitStage}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: /Delete document/i })
    fireEvent.click(deleteBtn)
    
    expect(mockOnDeleteDocument).toHaveBeenCalledWith('doc-1')
  })

  it('calls onSubmitStage when submit is clicked', async () => {
    const documents: Document[] = [
      {
        id: 'doc-1',
        documentTypeId: 'type-1',
        fileName: 'my_card.pdf',
        fileUrl: 'url',
        fileKey: 'key',
        fileSizeMB: 1,
        mimeType: 'application/pdf',
        status: 'PENDING',
        uploadedAt: new Date().toISOString(),
        documentType: { id: 'type-1', name: 'Library Card', description: null, isRequired: true, isActive: true, allowedFormats: [], maxFileSizeMB: 5 }
      }
    ]

    render(
      <ClearanceSubmissionPanel
        request={baseRequest}
        documents={documents}
        onUploadDocument={mockOnUploadDocument}
        onDeleteDocument={mockOnDeleteDocument}
        onSubmitStage={mockOnSubmitStage}
      />
    )

    const submitBtn = screen.getByRole('button', { name: /Submit.*for Review/i })
    
    await act(async () => {
      fireEvent.click(submitBtn)
    })
    
    expect(mockOnSubmitStage).toHaveBeenCalled()
  })

  it('renders administrative desk info when stage requires 0 documents', async () => {
    const zeroDocRequest: ClearanceRequest = {
      ...baseRequest,
      currentStageId: 'stage-bursary',
      currentStage: {
        id: 'stage-bursary',
        name: 'Bursary / Finance',
        documentRequirements: []
      }
    }

    render(
      <ClearanceSubmissionPanel
        request={zeroDocRequest}
        documents={[]}
        onUploadDocument={mockOnUploadDocument}
        onDeleteDocument={mockOnDeleteDocument}
        onSubmitStage={mockOnSubmitStage}
      />
    )

    expect(screen.getByText('Stage: Bursary / Finance')).toBeInTheDocument()
    expect(screen.getByText('Administrative Verification Desk')).toBeInTheDocument()
    expect(screen.getByText('Internal Desk Check')).toBeInTheDocument()

    const requestBtn = screen.getByRole('button', { name: /Request Bursary \/ Finance Verification/i })
    expect(requestBtn).not.toBeDisabled()

    await act(async () => {
      fireEvent.click(requestBtn)
    })

    expect(mockOnSubmitStage).toHaveBeenCalled()
  })
})
