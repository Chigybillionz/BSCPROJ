import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'http://localhost:5000'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetUrl = `${API_URL}/uploads/${path.join('/')}`

  try {
    const res = await fetch(targetUrl)
    if (!res.ok) {
      return new NextResponse(`Upload file not found: ${res.status}`, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'
    const arrayBuffer = await res.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    return new NextResponse(`Error proxying upload: ${err?.message || 'Server error'}`, { status: 502 })
  }
}
