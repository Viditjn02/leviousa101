import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get the latest-mac.yml file from Vercel Blob or your storage
    const blobUrl = process.env.BLOB_LATEST_MAC_YML || process.env.LATEST_MAC_YML_URL
    
    if (!blobUrl) {
      console.error('[Updates] BLOB_LATEST_MAC_YML environment variable not set')
      return NextResponse.json({ error: 'Update configuration not found' }, { status: 404 })
    }

    console.log('[Updates] Fetching latest-mac.yml from:', blobUrl)
    
    const response = await fetch(blobUrl, {
      headers: { 
        'Cache-Control': 'no-cache',
        'User-Agent': 'Leviousa-AutoUpdater/1.0'
      }
    })
    
    if (!response.ok) {
      console.error('[Updates] Failed to fetch latest-mac.yml:', response.status, response.statusText)
      return NextResponse.json({ error: 'Update file not available' }, { status: response.status })
    }
    
    const yamlContent = await response.text()
    console.log('[Updates] Successfully served latest-mac.yml')
    
    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('[Updates] Error serving latest-mac.yml:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
