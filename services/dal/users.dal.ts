import { eq } from "drizzle-orm";
import { db } from "../../db/connection";
import { users } from "../../db/schema/users";

export const checkExistingUser = async (email: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user || null;
};

export const getUserById = async (id: string) => {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user || null;
};

export const insertUser = async (userData: any, passwordHash: string) => {
  const [newUser] = await db.insert(users).values({
    email: userData.email,
    passwordHash: passwordHash
  }).returning();
  
  return newUser;
};
