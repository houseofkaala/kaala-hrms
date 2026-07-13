import fs from 'fs';
import path from 'path';
import { assertSafeStorageKey } from './storage-guard';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function saveDocumentFile(docId: string, contentBase64: string, mimeType: string): { storageKey: string; size: string } {
  ensureUploadDir();
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('File type not allowed. Use PDF, DOC, DOCX, JPG, or PNG.');
  }

  const buffer = Buffer.from(contentBase64, 'base64');
  if (buffer.length > MAX_BYTES) {
    throw new Error('File must be under 10MB.');
  }
  if (buffer.length === 0) {
    throw new Error('File is empty.');
  }

  const ext = mimeType === 'application/pdf' ? '.pdf'
    : mimeType.includes('wordprocessingml') ? '.docx'
    : mimeType === 'application/msword' ? '.doc'
    : mimeType === 'image/png' ? '.png'
    : '.jpg';

  const storageKey = `${docId}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, storageKey), buffer);

  const size = buffer.length < 1024 * 1024
    ? `${Math.round(buffer.length / 1024)} KB`
    : `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`;

  return { storageKey, size };
}

export function getDocumentFilePath(storageKey: string): string | null {
  if (!assertSafeStorageKey(storageKey, UPLOAD_DIR)) return null;
  const filePath = path.join(UPLOAD_DIR, storageKey);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

export function deleteDocumentFile(storageKey: string | undefined) {
  if (!storageKey || !assertSafeStorageKey(storageKey, UPLOAD_DIR)) return;
  const filePath = path.join(UPLOAD_DIR, storageKey);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}