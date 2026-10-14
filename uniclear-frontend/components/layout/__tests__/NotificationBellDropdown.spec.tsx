import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationBellDropdown } from '../NotificationBellDropdown'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { notificationsApi } from '@/lib/api/notifications.api'

jest.mock('@/lib/api/notifications.api', () => ({
  notificationsApi: {
    list: jest.fn(),
    getUnreadCount: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockNotifications = [
  {
    id: 'notif-1',
    universityId: 'uni-1',
    userId: 'user-1',
    title: 'Stage Approved',
    message: 'Your Library Clearance was approved!',
    type: 'STAGE_APPROVED',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    universityId: 'uni-1',
    userId: 'user-1',
    title: 'Stage Rejected',
    message: 'Your Bursary Clearance was rejected. Remarks: Payment receipt is blurred.',
    type: 'STAGE_REJECTED',
    isRead: true,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hr ago
  },
]

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('NotificationBellDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(notificationsApi.getUnreadCount as jest.Mock).mockResolvedValue({
      data: { success: true, data: { count: 1 } },
    })
    ;(notificationsApi.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: mockNotifications,
        meta: { total: 2, page: 1, limit: 15, totalPages: 1 },
      },
    })
    ;(notificationsApi.markAllRead as jest.Mock).mockResolvedValue({
      data: { success: true },
    })
    ;(notificationsApi.markRead as jest.Mock).mockResolvedValue({
      data: { success: true },
    })
  })

  it('renders the bell button with unread count badge', async () => {
    renderWithClient(<NotificationBellDropdown />)

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    expect(bellBtn).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  it('opens popover on click and displays notifications list', async () => {
    renderWithClient(<NotificationBellDropdown />)

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bellBtn)

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument()
      expect(screen.getByText('Your Library Clearance was approved!')).toBeInTheDocument()
      expect(
        screen.getByText('Your Bursary Clearance was rejected. Remarks: Payment receipt is blurred.')
      ).toBeInTheDocument()
    })
  })

  it('calls markAllRead when "Mark all read" button is clicked', async () => {
    renderWithClient(<NotificationBellDropdown />)

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bellBtn)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
    })

    const markAllBtn = screen.getByRole('button', { name: /mark all read/i })
    fireEvent.click(markAllBtn)

    await waitFor(() => {
      expect(notificationsApi.markAllRead).toHaveBeenCalledTimes(1)
    })
  })

  it('calls markRead when clicking an unread notification card', async () => {
    renderWithClient(<NotificationBellDropdown />)

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bellBtn)

    await waitFor(() => {
      expect(screen.getByText('Your Library Clearance was approved!')).toBeInTheDocument()
    })

    const unreadItem = screen.getByText('Your Library Clearance was approved!')
    fireEvent.click(unreadItem)

    await waitFor(() => {
      expect(notificationsApi.markRead).toHaveBeenCalledWith('notif-1')
    })
  })

  it('calls delete when clicking the dismiss button', async () => {
    ;(notificationsApi.delete as jest.Mock).mockResolvedValue({
      data: { success: true },
    })

    renderWithClient(<NotificationBellDropdown />)

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bellBtn)

    await waitFor(() => {
      const dismissButtons = screen.getAllByTitle('Dismiss notification')
      expect(dismissButtons.length).toBeGreaterThan(0)
    })

    const dismissButtons = screen.getAllByTitle('Dismiss notification')
    fireEvent.click(dismissButtons[0])

    await waitFor(() => {
      expect(notificationsApi.delete).toHaveBeenCalledWith('notif-1')
    })
  })

  it('renders empty state when there are no notifications', async () => {
    ;(notificationsApi.getUnreadCount as jest.Mock).mockResolvedValue({
      data: { success: true, data: { count: 0 } },
    })
    ;(notificationsApi.list as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [],
        meta: { total: 0, page: 1, limit: 15, totalPages: 0 },
      },
    })

    renderWithClient(<NotificationBellDropdown />)

    const bellBtn = screen.getByRole('button', { name: /notifications/i })
    fireEvent.click(bellBtn)

    await waitFor(() => {
      expect(screen.getByText('No notifications yet')).toBeInTheDocument()
    })
  })
})
