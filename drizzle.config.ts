import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  // Scan all schema files in the db folder
  schema: "./db/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
