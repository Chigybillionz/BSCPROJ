import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const host = req.headers.get('host') ?? ''

  // Ignore IP addresses (e.g. 192.168.x.x, 127.0.0.1) and localhost
  const isIp = /^(\d{1,3}\.){3}\d{1,3}/.test(host)
  const isLocal = host.includes('localhost') || isIp
  const subdomain = host.split('.')[0]
  const fromSubdomain = !isLocal && host.includes('.') && subdomain !== 'www'
    ? subdomain : null

  // Dev fallback: ?tenant=unn in URL (only on first visit / login page)
  const fromParam = req.nextUrl.searchParams.get('tenant')

  const slug = fromParam ?? fromSubdomain

  if (slug) {
    res.cookies.set('tenant_slug', slug, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })
  } else {
    res.cookies.delete('tenant_slug')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
