export const VOLTRA_MIN_IOS_DEPLOYMENT_TARGET = '16.4'

export function compareIOSDeploymentTargets(left: string, right: string): number | undefined {
  const leftParts = parseIOSDeploymentTarget(left)
  const rightParts = parseIOSDeploymentTarget(right)

  if (!leftParts || !rightParts) {
    return undefined
  }

  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0

    if (leftPart > rightPart) {
      return 1
    }

    if (leftPart < rightPart) {
      return -1
    }
  }

  return 0
}

export function isIOSDeploymentTargetAtLeast(value: string, minimum: string): boolean | undefined {
  const comparison = compareIOSDeploymentTargets(value, minimum)
  return comparison === undefined ? undefined : comparison >= 0
}

export function maxIOSDeploymentTarget(left: string, right: string): string {
  const comparison = compareIOSDeploymentTargets(left, right)
  return comparison !== undefined && comparison >= 0 ? left : right
}

function parseIOSDeploymentTarget(value: string): number[] | undefined {
  const normalizedValue = value.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')

  if (!/^\d+(?:\.\d+){0,2}$/.test(normalizedValue)) {
    return undefined
  }

  return normalizedValue.split('.').map((part) => Number(part))
}
