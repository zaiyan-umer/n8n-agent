import { NextResponse } from 'next/server';
import { checkExistingUser, insertUser } from '../../../../services/dal/users.dal';
import { hashPassword } from '../../../../utils/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const existingUser = await checkExistingUser(email);

    if (existingUser) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const user = await insertUser({ email }, hashedPassword);

    const { passwordHash, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'User created successfully',
      user: userWithoutPassword
    }, { status: 201 });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "User creation failed" }, { status: 500 });
  }
}
