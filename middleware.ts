import NextAuth from "next-auth"
import authConfig from "@/auth.config"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

const { auth } = NextAuth(authConfig)

export default auth(async (req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  // Check if user is blocked (for logged-in users)
  if (isLoggedIn && req.auth?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.user.id },
      select: { status: true },
    })

    if (user?.status === "BLOCKED") {
      // Clear session and redirect to login with error
      const loginUrl = new URL("/auth/login", req.nextUrl.origin)
      loginUrl.searchParams.set("error", "AccountBlocked")
      loginUrl.searchParams.set("message", "Your account has been blocked. Please contact support.")
      return NextResponse.redirect(loginUrl)
    }
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

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith("/auth/") && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*", "/auth/:path*", "/admin/:path*"],
}
