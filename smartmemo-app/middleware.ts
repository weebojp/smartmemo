import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if we have the required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Supabase environment variables not found, skipping auth middleware')
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Auth paths that don't require authentication
    const authPaths = ['/login', '/signup']
    const isAuthPath = authPaths.includes(request.nextUrl.pathname)

    // For now, let's be more specific about protected paths
    const isHomePage = request.nextUrl.pathname === '/'

    console.log('Middleware:', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      isAuthPath,
      isHomePage
    })

    if (!user && isHomePage) {
      // Redirect to login if user is not authenticated and trying to access home
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      console.log('Redirecting to login')
      return NextResponse.redirect(url)
    }

    if (user && isAuthPath) {
      // Redirect to home if user is authenticated and trying to access auth pages
      const url = request.nextUrl.clone()
      url.pathname = '/'
      console.log('Redirecting authenticated user to home')
      return NextResponse.redirect(url)
    }

  } catch (error) {
    console.error('Middleware auth error:', error)
    // If auth check fails, continue without redirect
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}