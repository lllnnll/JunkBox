import { NextRequest, NextResponse } from 'next/server';
import { RESERVED_SLUGS } from '@/lib/room-slug';

export function proxy(request: NextRequest) {
  // Add the room slug to the request headers if it exists in the path
  const { pathname } = request.nextUrl;
  
  // Extract slug from path like /nikita/... (or a host email, resolved by getRoomBySlug)
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0) {
    const firstSegment = pathSegments[0];
    if (!RESERVED_SLUGS.includes(firstSegment)) {
      // This looks like a room slug
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-room-slug', decodeURIComponent(firstSegment));
      
      // Create a new request with updated headers
      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (special auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
