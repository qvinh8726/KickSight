import { Pool, QueryResult, PoolClient } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool | null = null;
let dbHealthy = false;

if (DATABASE_URL) {
  const needsSsl = DATABASE_URL.includes("neon.tech") ||
    DATABASE_URL.includes("supabase.co") ||
    DATABASE_URL.includes("railway.app") ||
    DATABASE_URL.includes("sslmode=require") ||
    process.env.NODE_ENV === "production";

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  });

  pool.on("error", (err) => {
    console.error("[DB] Unexpected error on idle client", err);
    dbHealthy = false;
  });

  pool.on("connect", () => {
    dbHealthy = true;
  });

  // Test connection on startup
  pool.query("SELECT 1")
    .then(() => { dbHealthy = true; console.log("[DB] PostgreSQL pool initialized — connection verified"); })
    .catch((err) => { console.error("[DB] Connection test failed:", err.message); dbHealthy = false; });

} else {
  console.warn("[DB] DATABASE_URL not set — auth and predictions features disabled");
}

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  if (!pool) {
    throw new Error("Database not configured. Set DATABASE_URL environment variable.");
  }
  try {
    const result = await pool.query(text, params);
    dbHealthy = true;
    return result;
  } catch (err: any) {
    if (err.code === "ECONNREFUSED" || err.code === "57P01") {
      dbHealthy = false;
    }
    throw err;
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("Database not configured.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function isDbAvailable(): boolean {
  return pool !== null;
}

export function isDbHealthy(): boolean {
  return pool !== null && dbHealthy;
}

export async function closePool() {
  if (pool) await pool.end();
}

export default pool;
