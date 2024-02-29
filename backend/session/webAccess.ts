import { strict as assert } from 'assert';
import { SocketClientRequest } from '@/types/SocketClientRequest';
import { settingsLoaded } from '@/server';
import { isReadOnlyId } from '@/service/pads/ReadOnlyManager';

export const normalizeAuthzLevel = (level: string|boolean) => {
  if (!level) return false;
  switch (level) {
    case true:
      return 'create';
    case 'readOnly':
    case 'modify':
    case 'create':
      return level;
    default:
      console.warn(`Unknown authorization level '${level}', denying access`);
  }
  return false;
};


export const userCanModify = (padId: string, req: SocketClientRequest) => {
  if (isReadOnlyId(padId)) return false;
  if (!settingsLoaded.requireAuthentication) return true;
  const {session: {user} = {}} = req;
  if (!user || user.readOnly) return false;
  assert(user.padAuthorizations); // This is populated even if !settings.requireAuthorization.
  const level = normalizeAuthzLevel(user.padAuthorizations[padId]);
  return level && level !== 'readOnly';
};
