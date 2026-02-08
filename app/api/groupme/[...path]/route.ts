// Server-side proxy for GroupMe API
// Avoids CORS issues (especially on 429 error responses which lack CORS headers)
// and allows us to add retry/throttle logic server-side

import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://api.groupme.com/v3'
const IMAGE_BASE = 'https://image.groupme.com/pictures'

// Simple per-token rate limiter: track last request time
const lastRequestTime = new Map<string, number>()
const MIN_DELAY = 120 // ms between requests per token

async function throttle(token: string) {
  const last = lastRequestTime.get(token) || 0
  const now = Date.now()
  const wait = Math.max(0, MIN_DELAY - (now - last))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  lastRequestTime.set(token, Date.now())
}

async function proxyRequest(
  path: string,
  token: string,
  method: string,
  body: string | null,
  contentType: string | null,
  retries = 2
): Promise<Response> {
  await throttle(token)

  const sep = path.includes('?') ? '&' : '?'
  const url = `${BASE}/${path}${sep}token=${token}`

  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType

  const res = await fetch(url, {
    method,
    headers,
    body: body || undefined,
  })

  // Retry on 429 with exponential backoff
  if (res.status === 429 && retries > 0) {
    const delay = (3 - retries) * 1000 // 1s, 2s
    await new Promise(r => setTimeout(r, delay))
    return proxyRequest(path, token, method, body, contentType, retries - 1)
  }

  return res
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

  // Reconstruct the full path with query params (minus our token)
  const searchParams = new URLSearchParams(request.nextUrl.searchParams)
  searchParams.delete('token')
  const queryString = searchParams.toString()
  const fullPath = path.join('/') + (queryString ? `?${queryString}` : '')

  try {
    const res = await proxyRequest(fullPath, token, 'GET', null, null)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `GroupMe API error ${res.status}`, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: 'Proxy error', detail: String(e) },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const fullPath = path.join('/')
  const contentType = request.headers.get('content-type')
  const body = await request.text()

  // Special handling for image uploads
  if (fullPath === 'pictures') {
    await throttle(token)
    const res = await fetch(IMAGE_BASE, {
      method: 'POST',
      headers: {
        'X-Access-Token': token,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: await request.arrayBuffer(),
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Upload failed' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  }

  try {
    const res = await proxyRequest(fullPath, token, 'POST', body, contentType)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `GroupMe API error ${res.status}`, detail: text },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json(
      { error: 'Proxy error', detail: String(e) },
      { status: 502 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const token = request.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 401 })

  const fullPath = path.join('/')

  try {
    await throttle(token)
    const sep = fullPath.includes('?') ? '&' : '?'
    const url = `${BASE}/${fullPath}${sep}token=${token}`
    const res = await fetch(url, { method: 'DELETE' })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Delete failed ${res.status}` },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Proxy error', detail: String(e) },
      { status: 502 }
    )
  }
}
