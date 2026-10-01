/**
 * WebHarvest Browser Session Importer
 *
 * Imports authenticated browser sessions from exported JSON states.
 */

import { parseStorageStateJson, PlaywrightStorageState } from './session';
import { createAuthProfile } from '../db/client';

export interface ImportSessionOptions {
  name: string;
  domain: string;
  rawJson: string;
}

export function importAuthSession(options: ImportSessionOptions): {
  success: boolean;
  profileId?: string;
  storageState?: PlaywrightStorageState;
  error?: string;
} {
  const parsed = parseStorageStateJson(options.rawJson);
  if (!parsed) {
    return {
      success: false,
      error: 'Invalid session format. Must be a valid Playwright storageState JSON or cookie array.',
    };
  }

  const profileId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    createAuthProfile({
      id: profileId,
      name: options.name,
      domain: options.domain,
      auth_type: 'storage_state',
      storage_state: JSON.stringify(parsed),
    });

    return {
      success: true,
      profileId,
      storageState: parsed,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to save authentication profile',
    };
  }
}
