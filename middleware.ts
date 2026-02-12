import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Check if user is blocked (status is now in the token)
  if (isLoggedIn && req.auth?.user?.status === "BLOCKED") {
    // Clear session and redirect to login with error
    const loginUrl = new URL("/auth/login", req.nextUrl.origin)
    loginUrl.searchParams.set("error", "AccountBlocked")
    loginUrl.searchParams.set("message", "Your account has been blocked. Please contact support.")
    return NextResponse.redirect(loginUrl)
  }

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

  // Redirect logged-in users away from auth pages (except CLI auth flow)
  if (pathname.startsWith("/auth/") && isLoggedIn) {
    if (pathname === "/auth/cli") {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/admin/:path*"],
}
