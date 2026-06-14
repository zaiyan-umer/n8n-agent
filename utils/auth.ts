import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET!;

// --- HASHING UTILS ---

export const hashPassword = async (password: string | number): Promise<string> => {
  return await bcrypt.hash(String(password), SALT_ROUNDS);
};

export const compareHash = async (password: string | number, hash: string): Promise<boolean> => {
  return await bcrypt.compare(String(password), hash);
};

// --- JWT UTILS ---

export interface TokenPayload {
  id: string;
  email: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
};
