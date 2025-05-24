// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { decrypt, updateSession } from '@/lib/auth';

// Define protected and public routes
const protectedRoutes = ['/filesystem', '/player', '/api/filesystem', '/api/videos', '/api/extract-subtitles', '/api/video-subtitles', '/api/subtitle-file'];
const publicRoutes = ['/login', '/api/auth'];

export default async function middleware(req: NextRequest) {
  // Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path.startsWith(route));

  console.log(`Middleware: ${path}, Protected: ${isProtectedRoute}, Public: ${isPublicRoute}`);

  // Decrypt the session from the cookie
  const cookie = req.cookies.get('session')?.value;
  let session = null;
  
  if (cookie) {
    try {
      session = await decrypt(cookie);
      console.log(`Middleware: Session found for user: ${session?.userId}`);
    } catch (error) {
      console.error('Session decryption failed:', error);
      // Clear invalid session cookie
      const response = NextResponse.redirect(new URL('/login', req.nextUrl));
      response.cookies.set('session', '', { 
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });
      return response;
    }
  } else {
    console.log('Middleware: No session cookie found');
  }

  // Redirect to /login if the user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !session?.userId) {
    console.log('Middleware: Redirecting to login - no valid session');
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Redirect to /filesystem if the user is authenticated and trying to access login
  if (path === '/login' && session?.userId) {
    console.log('Middleware: Redirecting authenticated user from login to filesystem');
    return NextResponse.redirect(new URL('/filesystem', req.nextUrl));
  }

  // Update the session to extend expiration
  if (session?.userId) {
    return await updateSession(req);
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};