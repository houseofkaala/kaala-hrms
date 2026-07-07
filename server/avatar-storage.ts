import fs from 'fs';
import path from 'path';
import { deleteDocumentFile } from './document-storage';

const AVATAR_DIR = path.join(process.cwd(), 'data', 'uploads', 'avatars');
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/jpg', 'image/webp']);

function ensureAvatarDir() {
  if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

function extForMime(mimeType: string): string {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

export function saveAvatar(userId: string, contentBase64: string, mimeType: string): string {
  ensureAvatarDir();
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new Error('Use JPG, PNG, or WebP for profile photos.');
  }
  const buffer = Buffer.from(contentBase64, 'base64');
  if (buffer.length > MAX_BYTES) throw new Error('Photo must be under 5MB.');
  if (buffer.length === 0) throw new Error('Photo is empty.');

  const storageKey = `avatars/${userId}${extForMime(mimeType)}`;
  const fullPath = path.join(process.cwd(), 'data', 'uploads', storageKey);
  fs.writeFileSync(fullPath, buffer);
  return storageKey;
}

export function getAvatarPath(storageKey: string | undefined): string | null {
  if (!storageKey) return null;
  const fullPath = path.join(process.cwd(), 'data', 'uploads', storageKey);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}

export function deleteAvatar(storageKey: string | undefined) {
  deleteDocumentFile(storageKey);
}

export function avatarMime(storageKey: string): string {
  if (storageKey.endsWith('.png')) return 'image/png';
  if (storageKey.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}