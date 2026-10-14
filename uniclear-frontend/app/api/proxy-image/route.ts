import { NextResponse } from 'next/server'

function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) return new NextResponse('Missing URL', { status: 400 })

  if (!isSafeUrl(url)) {
    return new NextResponse('Invalid or forbidden URL target', { status: 403 })
  }

  try {
    const res = await fetch(url)
    if (!res.ok) return new NextResponse(`Upstream failed: ${res.status}`, { status: res.status })
    const buffer = await res.arrayBuffer()
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 })
  }
}
