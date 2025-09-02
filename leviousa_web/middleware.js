import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = request.nextUrl.clone()
  
  // Check if countdown is active (hardcoded for immediate launch)
  const isCountdownActive = true; // COUNTDOWN MODE ENABLED
  
  // If countdown is active and user is visiting root domain
  if (isCountdownActive && url.pathname === '/') {
    url.pathname = '/countdown.html'
    return NextResponse.redirect(url)
  }
  
  // Block landing.html access during countdown
  if (isCountdownActive && url.pathname === '/landing.html') {
    url.pathname = '/countdown.html'
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/landing.html']
}
