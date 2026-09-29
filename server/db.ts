import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local if present, then .env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool | null {
  if (!connectionString) {
    console.warn('[DB] Warning: DATABASE_URL not set in environment.');
    return null;
  }

  if (!pool) {
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[DB Pool Error]: Unexpected client error', err.message);
    });
  }

  return pool;
}

export function safeJsonParse<T>(value: any, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
