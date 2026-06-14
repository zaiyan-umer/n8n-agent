import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET
);

export async function proxy(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');

  const handleUnauthorized = () => {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  };

  if (!token) {
    return handleUnauthorized();
  }

  try {
    await jwtVerify(token, JWT_SECRET);
    return NextResponse.next();
  } catch (error) {
    return handleUnauthorized();
  }
}

export const config = {
  matcher: ['/', '/api/chat/:path*', '/chat/:path*'],
};
