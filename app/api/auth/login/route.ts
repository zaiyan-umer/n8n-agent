import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { checkExistingUser } from '../../../../services/dal/users.dal';
import { compareHash, generateToken } from '../../../../utils/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const existingUser = await checkExistingUser(email);

    if (!existingUser) {
      return NextResponse.json({ message: "Invalid Credentials" }, { status: 401 });
    }

    const isPasswordValid = await compareHash(password, existingUser.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid Credentials" }, { status: 401 });
    }

    const token = generateToken({
      id: existingUser.id,
      email: existingUser.email
    });

    const { passwordHash, ...userWithoutPassword } = existingUser;

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 1 day in seconds
    });

    return NextResponse.json({
      message: 'User logged-in successfully',
      user: userWithoutPassword,
    }, { status: 200 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Login failed" }, { status: 500 });
  }
}
