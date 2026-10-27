export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getInitials(name?: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function formatMatricNo(matric: string): string {
  return matric.toUpperCase()
}

export function normalizeDocUrl(url?: string | null): string {
  if (!url) return ''
  if (url.includes('/uploads/')) {
    return url.substring(url.indexOf('/uploads/'))
  }
  return url
}

