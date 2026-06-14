import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../../../../utils/auth';
import { getUserById } from '../../../../services/dal/users.dal';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await getUserById(payload.id);

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { passwordHash, ...userWithoutPassword } = currentUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Current user retrieval failed" }, { status: 500 });
  }
}
