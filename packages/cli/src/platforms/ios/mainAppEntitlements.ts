import path from 'node:path'

import type { IOSProjectDiscovery } from '../../discovery/ios'

export function resolveMainAppEntitlementsPath(discovery: IOSProjectDiscovery): string {
  if (discovery.entitlementsPath) {
    return discovery.entitlementsPath
  }

  return path.join(path.dirname(discovery.infoPlistPath), `${discovery.mainTargetName}.entitlements`)
}
