export const ROLES = {
  PLATFORM_OWNER: 'PLATFORM_OWNER',
  SUPER_ADMIN:    'SUPER_ADMIN',
  ADMIN:          'ADMIN',
  OFFICER:        'OFFICER',
  STUDENT:        'STUDENT',
} as const

export type Role = keyof typeof ROLES

export const STATUS_COLORS = {
  APPROVED:    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  PENDING:     { bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-500'   },
  REJECTED:    { bg: 'bg-red-50',      text: 'text-red-700',      dot: 'bg-red-500'     },
  IN_PROGRESS: { bg: 'bg-blue-50',     text: 'text-blue-700',     dot: 'bg-blue-500'    },
  COMPLETED:   { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-500' },
  SUBMITTED:   { bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-500'   },
} as const

export const ROUTES = {
  login:               '/login',
  student: {
    dashboard:  '/student/dashboard',
    documents:  '/student/documents',
    clearance:  '/student/clearance',
    certificate:'/student/certificate',
  },
  officer: {
    dashboard:  '/officer/dashboard',
    queue:      '/officer/queue',
    settings:   '/officer/settings',
    review:     (id: string) => `/officer/review/${id}`,
  },
  admin: {
    dashboard:  '/admin/dashboard',
    campaigns:  '/admin/campaigns',
    students:   '/admin/students',
    officers:   '/admin/officers',
    stages:     '/admin/stages',
    documents:  '/admin/documents',
    branding:   '/admin/branding',
    sessions:   '/admin/sessions',
    reports:    '/admin/reports',
    developer:  '/admin/developer',
    structure:  '/admin/structure',
    audit:      '/admin/audit',
  },
  platform: {
    dashboard:    '/platform/dashboard',
    universities: '/platform/universities',
  },
} as const
