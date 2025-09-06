import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = request.nextUrl.clone()
  
  // Check if we should show wait page (enabled - show wait page)
  const showWaitPage = true; // WAIT PAGE MODE ENABLED - SHOW "LITTLE MORE WAIT" PAGE
  
  // If wait page is active and user is visiting root domain
  if (showWaitPage && url.pathname === '/') {
    url.pathname = '/wait.html'
    return NextResponse.redirect(url)
  }
  
  // Block landing.html access during wait mode
  if (showWaitPage && url.pathname === '/landing.html') {
    url.pathname = '/wait.html'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/landing.html']
}
