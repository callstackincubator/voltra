import type { IOSProjectDiscovery } from '../../discovery/ios'
import type { ResolvedVoltraIOSConfig } from '../../config/types'

export function resolveIOSWidgetTargetName(ios: ResolvedVoltraIOSConfig, discovery: IOSProjectDiscovery): string {
  if (ios.targetName) {
    return ios.targetName
  }

  const sanitizedTargetName = discovery.mainTargetName.replace(/[^A-Za-z0-9_]/g, '')
  return `${sanitizedTargetName}LiveActivity`
}
