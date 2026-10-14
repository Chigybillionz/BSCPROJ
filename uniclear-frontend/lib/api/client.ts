import axios from 'axios'

// All client requests go through the Next.js proxy at /api/v1/*
// The proxy extracts the httpOnly access_token cookie and forwards it as Bearer token to Express
export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
})

let refreshPromise: Promise<any> | null = null

// Silent token refresh on 401 with mutex to prevent race conditions on token rotation
apiClient.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config

    // Network error — server unreachable
    if (!error.response) {
      return Promise.reject(new Error('Cannot reach server. Check your connection.'))
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post('/api/auth/refresh', {}, { withCredentials: true })
            .finally(() => {
              refreshPromise = null
            })
        }
        await refreshPromise
        return apiClient(original)
      } catch {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login' && !window.location.pathname.startsWith('/verify')) {
          window.location.href = '/login'
        }
      }
    }

    // Extract backend error message globally so UI components get friendly messages
    if (error.response?.data?.message) {
      error.message = error.response.data.message
    } else if (error.response?.status === 500) {
      error.message = 'An unexpected server error occurred. Please try again later.'
    }

    return Promise.reject(error)
  }
)
