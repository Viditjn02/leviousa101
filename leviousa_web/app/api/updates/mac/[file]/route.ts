import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  try {
    const { file } = params
    
    // Validate file name (security check)
    if (!file || !file.match(/^Leviousa-[\d\.]+-mac\.(zip|zip\.blockmap)$/)) {
      console.error('[Updates] Invalid file name:', file)
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 })
    }
    
    // Construct blob URL
    const blobBase = process.env.BLOB_BASE_URL || process.env.VERCEL_BLOB_BASE_URL
    if (!blobBase) {
      console.error('[Updates] BLOB_BASE_URL environment variable not set')
      return NextResponse.json({ error: 'Storage configuration not found' }, { status: 500 })
    }
    
    const targetUrl = `${blobBase}/${file}`
    console.log('[Updates] Fetching update file:', targetUrl)
    
    const response = await fetch(targetUrl, {
      headers: { 
        'Cache-Control': 'public, max-age=31536000, immutable',
        'User-Agent': 'Leviousa-AutoUpdater/1.0'
      }
    })
    
    if (!response.ok) {
      console.error('[Updates] Failed to fetch update file:', response.status, response.statusText)
      return NextResponse.json({ error: 'Update file not found' }, { status: response.status })
    }
    
    // Determine content type
    const contentType = file.endsWith('.zip') 
      ? 'application/zip'
      : file.endsWith('.blockmap') 
      ? 'application/octet-stream'
      : 'application/octet-stream'
    
    // Get the file buffer
    const buffer = await response.arrayBuffer()
    console.log('[Updates] Successfully serving update file:', file, 'Size:', buffer.byteLength, 'bytes')
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Access-Control-Expose-Headers': 'Content-Length, Accept-Ranges'
      }
    })
  } catch (error) {
    console.error('[Updates] Error serving update file:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Handle HEAD requests for range support
export async function HEAD(
  request: NextRequest,
  { params }: { params: { file: string } }
) {
  // Same logic as GET but only return headers
  try {
    const { file } = params
    
    if (!file || !file.match(/^Leviousa-[\d\.]+-mac\.(zip|zip\.blockmap)$/)) {
      return new NextResponse(null, { status: 400 })
    }
    
    const blobBase = process.env.BLOB_BASE_URL || process.env.VERCEL_BLOB_BASE_URL
    if (!blobBase) {
      return new NextResponse(null, { status: 500 })
    }
    
    const targetUrl = `${blobBase}/${file}`
    const response = await fetch(targetUrl, { method: 'HEAD' })
    
    if (!response.ok) {
      return new NextResponse(null, { status: response.status })
    }
    
    const contentType = file.endsWith('.zip') ? 'application/zip' : 'application/octet-stream'
    const contentLength = response.headers.get('content-length') || '0'
    
    return new NextResponse(null, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': contentLength,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    console.error('[Updates] Error in HEAD request:', error)
    return new NextResponse(null, { status: 500 })
  }
}
