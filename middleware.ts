import { auth } from "@/auth"
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/publish')) {
    if (!req.auth) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/publish', '/dashboard'],
}
