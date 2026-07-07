import fs from 'fs';
import path from 'path';
import type { Database } from './db';

const DB_PATH = path.join(process.cwd(), 'data', 'store.json');

export type StorageBackend = 'file' | 'postgres';

let backend: StorageBackend = 'file';
let pool: import('pg').Pool | null = null;
let saveChain = Promise.resolve();

function useSsl() {
  if (process.env.DATABASE_SSL === 'false') return undefined;
  if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sslmode=require')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function getStorageBackend(): StorageBackend {
  return backend;
}

export async function initPersistence(): Promise<StorageBackend> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    backend = 'file';
    return backend;
  }

  const { Pool } = await import('pg');
  pool = new Pool({ connectionString: databaseUrl, ssl: useSsl() });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS hrms_store (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  backend = 'postgres';
  return backend;
}

export function readFileStore(): Database | null {
  try {
    if (!fs.existsSync(DB_PATH)) return null;
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Database;
  } catch {
    return null;
  }
}

export async function readPostgresStore(): Promise<Database | null> {
  if (!pool) return null;
  const result = await pool.query<{ data: Database }>('SELECT data FROM hrms_store WHERE id = 1');
  return result.rows[0]?.data ?? null;
}

export function writeFileStore(data: Database) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const compact = process.env.NODE_ENV === 'production';
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, compact ? 0 : 2));
}

async function writePostgresStore(data: Database) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO hrms_store (id, data, updated_at)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [JSON.stringify(data)],
  );
}

let fileSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingFileData: Database | null = null;
const FILE_SAVE_DEBOUNCE_MS = 500;

function flushFileStoreNow() {
  if (fileSaveTimer) {
    clearTimeout(fileSaveTimer);
    fileSaveTimer = null;
  }
  if (!pendingFileData) return;
  const data = pendingFileData;
  pendingFileData = null;
  try {
    writeFileStore(data);
  } catch (err) {
    console.error('[HRMS] File save failed:', err);
  }
}

export function persistStore(data: Database) {
  if (backend === 'postgres') {
    saveChain = saveChain
      .then(() => writePostgresStore(data))
      .catch((err) => console.error('[HRMS] PostgreSQL save failed:', err));
    return;
  }
  pendingFileData = data;
  if (fileSaveTimer) return;
  fileSaveTimer = setTimeout(() => {
    fileSaveTimer = null;
    flushFileStoreNow();
  }, FILE_SAVE_DEBOUNCE_MS);
}

export async function flushPersistence() {
  flushFileStoreNow();
  await saveChain;
}