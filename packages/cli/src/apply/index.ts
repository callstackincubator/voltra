import type { VoltraPlatform } from '../config/types'

export interface ApplyOptions {
  configPath?: string
  platform?: VoltraPlatform
}

export interface ApplyResult {
  exitCode: number
  errorMessage?: string
}

export async function applyVoltra(_options: ApplyOptions): Promise<ApplyResult> {
  return {
    exitCode: 1,
    errorMessage: 'voltra apply is not implemented yet.',
  }
}
