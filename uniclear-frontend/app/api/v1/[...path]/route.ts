import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const RAW_API_URL = process.env.API_URL || 'http://localhost:5000'
const API_URL = RAW_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')

async function refreshAccessToken(): Promise<string | null> {
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
  cookieStore.set('access_token', json.data.accessToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 60 * 15,
  })
  cookieStore.set('refresh_token', json.data.refreshToken, {
    httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
  })

  return json.data.accessToken
}

async function doFetch(url: string, method: string, headers: Headers, body: any, token: string | undefined): Promise<Response> {
  const reqHeaders = new Headers(headers)
  if (token) reqHeaders.set('Authorization', `Bearer ${token}`)

  const init: RequestInit = {
    method,
    headers: reqHeaders,
  }

  if (body !== undefined && !['GET', 'HEAD'].includes(method)) {
    init.body = body
    // @ts-expect-error Node.js fetch requires duplex: 'half' for streaming request bodies
    init.duplex = 'half'
  }

  return fetch(url, init)
}

async function proxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const tenantSlug = cookieStore.get('tenant_slug')?.value

  const { path } = await params
  // Use URLSearchParams to avoid duplicate parameters (e.g. ?tenant=unn&tenant=192)
  const searchParams = new URLSearchParams(req.nextUrl.search)
  if (tenantSlug && !searchParams.has('tenant') && !/^\d+$/.test(tenantSlug)) {
    searchParams.set('tenant', tenantSlug)
  }
  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : ''
  const url = `${API_URL}/api/v1/${path.join('/')}${queryStr}`

  const contentType = req.headers.get('content-type') || ''
  const isMultipart = contentType.includes('multipart/form-data')
  const headers = new Headers()
  
  let incomingEntries: [string, FormDataEntryValue][] = []
  let rawBody: string | undefined
  if (!['GET', 'HEAD'].includes(req.method)) {
    if (isMultipart) {
      const incomingFormData = await req.formData()
      incomingEntries = Array.from(incomingFormData.entries())
    } else {
      headers.set('Content-Type', contentType || 'application/json')
      rawBody = await req.text()
    }
  }

  const getBody = () => {
    if (['GET', 'HEAD'].includes(req.method)) return undefined
    if (isMultipart) {
      const forwardFormData = new FormData()
      for (const [key, value] of incomingEntries) {
        if (value instanceof Blob) {
          const filename = (value as File).name || 'file'
          forwardFormData.append(key, value, filename)
        } else {
          forwardFormData.append(key, value)
        }
      }
      return forwardFormData
    }
    return rawBody
  }

  let res: Response
  try {
    res = await doFetch(url, req.method, headers, getBody(), token)
  } catch {
    return NextResponse.json({ success: false, message: 'Cannot reach server. Please try again later.' }, { status: 503 })
  }

  // Token missing or expired — try refresh once
  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      try {
        res = await doFetch(url, req.method, headers, getBody(), newToken)
      } catch {
        return NextResponse.json({ success: false, message: 'Cannot reach server. Please try again later.' }, { status: 503 })
      }
    }
  }

  const resContentType = res.headers.get('content-type') ?? ''
  if (resContentType.includes('text/csv')) {
    const csvText = await res.text()
    const contentDisposition = res.headers.get('content-disposition') || 'attachment; filename="clearance-report.csv"'
    return new NextResponse(csvText, {
      status: res.status,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': contentDisposition,
      },
    })
  }

  const resBody = resContentType.includes('application/json') ? await res.json() : await res.text()
  return NextResponse.json(resBody, { status: res.status })
}

export const GET    = proxy
export const POST   = proxy
export const PATCH  = proxy
export const PUT    = proxy
export const DELETE = proxy
