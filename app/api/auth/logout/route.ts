import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('token');
    
    return NextResponse.json({
      message: 'User logged-out successfully',
    }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Logout failed" }, { status: 500 });
  }
}
