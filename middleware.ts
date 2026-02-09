import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/login", req.nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/auth/login", req.nextUrl.origin)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith("/auth/") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/admin/:path*"],
}
