import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// Production (Vercel + Neon) uses the Neon HTTP driver. Local development
// against a plain Postgres instance (no Neon endpoint in the URL) falls back
// to node-postgres, since Neon's serverless driver only speaks to Neon's
// proxy. Same schema and query API either way via drizzle-orm.
const isNeon = databaseUrl.includes("neon.tech");

export const db = isNeon
  ? drizzleNeon(neon(databaseUrl), { schema })
  : drizzlePg(new Pool({ connectionString: databaseUrl }), { schema });
