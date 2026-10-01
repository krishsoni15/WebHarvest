/**
 * WebHarvest Content Hashing & Storage Addressing
 *
 * Provides cryptographic hashing for content deduplication and content-addressed storage.
 */

import crypto from 'crypto';
import path from 'path';

/**
 * Computes the SHA-256 digest of a binary Buffer.
 */
export function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes the SHA-256 digest of a UTF-8 string.
 */
export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Generates a two-level content-addressed relative path from a SHA-256 hash.
 * e.g., 'a1b2c3d4...' -> 'objects/a1/b2/a1b2c3d4...ext'
 */
export function getContentAddressedPath(hash: string, extension: string = ''): string {
  const ext = extension ? (extension.startsWith('.') ? extension : `.${extension}`) : '';
  const dir1 = hash.slice(0, 2);
  const dir2 = hash.slice(2, 4);
  return path.posix.join('objects', dir1, dir2, `${hash}${ext}`);
}
