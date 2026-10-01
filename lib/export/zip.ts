/**
 * WebHarvest Streaming ZIP Exporter
 *
 * Creates streaming ZIP archives directly from mirror directories using archiver.
 */

import * as archiverModule from 'archiver';
import { Readable } from 'stream';

const archiver = (archiverModule as any).default || archiverModule;

export interface CreateZipOptions {
  sourceDir: string;
  archivePrefix?: string;
}

/**
 * Creates a readable stream containing the compressed ZIP archive of a mirror directory.
 */
export function createMirrorZipStream(sourceDir: string, archivePrefix: string = ''): Readable {
  const archive = archiver('zip', {
    zlib: { level: 6 }, // Balanced compression speed vs ratio
  });

  // Pipe directory contents into archive
  archive.directory(sourceDir, archivePrefix);

  // Finalize stream in background
  archive.finalize().catch((err: any) => {
    archive.emit('error', err);
  });

  return archive;
}
