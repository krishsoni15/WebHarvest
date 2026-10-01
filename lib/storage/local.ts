/**
 * WebHarvest Local Storage Provider
 *
 * Implements filesystem-based storage interface for mirror archives and content assets.
 */

import path from 'path';
import fs from 'fs/promises';

export interface StorageProvider {
  write(relativePath: string, data: Buffer | string): Promise<void>;
  read(relativePath: string): Promise<Buffer>;
  exists(relativePath: string): Promise<boolean>;
  delete(relativePath: string): Promise<void>;
  resolve(relativePath: string): string;
}

export class LocalStorageProvider implements StorageProvider {
  constructor(private baseDir: string) {}

  resolve(relativePath: string): string {
    return path.join(this.baseDir, relativePath);
  }

  async write(relativePath: string, data: Buffer | string): Promise<void> {
    const fullPath = this.resolve(relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
  }

  async read(relativePath: string): Promise<Buffer> {
    const fullPath = this.resolve(relativePath);
    return fs.readFile(fullPath);
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = this.resolve(relativePath);
    await fs.rm(fullPath, { recursive: true, force: true });
  }
}
