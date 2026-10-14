import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_URL || 'http://localhost:5000'

async function attemptRefresh(): Promise<string | null> {
  const cookieStore = await cookies()
  const refreshToken = cookieStore.get('refresh_token')?.value
  if (!refreshToken) return null

  const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  })

  const json = await res.json()
  if (!json.success) return null

  const isProd = process.env.NODE_ENV === 'production'
  const maxAge = 60 * 15

  try {
    cookieStore.set('access_token', json.data.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    cookieStore.set('refresh_token', json.data.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
  } catch {
    // Next.js throws an error if cookies are modified within a Server Component.
    // We swallow the error and return the new token so the current request can complete.
    // Client-side requests will automatically refresh the cookie via axios interceptors.
  }

  return json.data.accessToken
}

export async function serverFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  const doFetch = (t: string | undefined) =>
    fetch(`${API_URL}/api/v1${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...options?.headers,
      },
      cache: 'no-store',
    })

  let res = await doFetch(token)
  let json = await res.json()

  if (!json.success && res.status === 401) {
    // Access token expired — try refresh
    const newToken = await attemptRefresh()
    if (!newToken) redirect('/login')

    res  = await doFetch(newToken)
    json = await res.json()
  }

  if (!json.success) throw new Error(json.message ?? 'Request failed')
  return json.data as T
}
