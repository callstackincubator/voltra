const PREFIX = '[voltra]'

export type ReportedChangeKind = 'created' | 'updated' | 'deleted'

export interface ReportedChange {
  kind: ReportedChangeKind
  path: string
}

export interface ApplySummary {
  changes: ReportedChange[]
  warnings?: string[]
}

export interface PreflightIssue {
  message: string
  path?: string
}

export interface PreflightFailureReport {
  summary?: string
  issues: PreflightIssue[]
}

export class VoltraCliError extends Error {
  readonly code: string

  constructor(message: string, code = 'VOLTRA_CLI_ERROR') {
    super(message)
    this.name = 'VoltraCliError'
    this.code = code
  }
}

export class PreflightError extends VoltraCliError {
  readonly report: PreflightFailureReport

  constructor(report: PreflightFailureReport) {
    super(formatPreflightFailure(report), 'VOLTRA_PREFLIGHT_FAILED')
    this.name = 'PreflightError'
    this.report = report
  }
}

export function formatApplySummary(summary: ApplySummary): string {
  const lines = [
    `${PREFIX} Apply summary`,
    `${PREFIX} Created: ${countChanges(summary.changes, 'created')}`,
    `${PREFIX} Updated: ${countChanges(summary.changes, 'updated')}`,
    `${PREFIX} Deleted: ${countChanges(summary.changes, 'deleted')}`,
  ]

  for (const kind of ['created', 'updated', 'deleted'] as const) {
    const paths = summary.changes.filter((change) => change.kind === kind).map((change) => change.path)

    for (const filePath of paths) {
      lines.push(`${PREFIX} ${capitalize(kind)} ${filePath}`)
    }
  }

  for (const warning of summary.warnings ?? []) {
    lines.push(formatWarning(warning))
  }

  return lines.join('\n')
}

export function formatDirtyWorktreeWarning(details?: string): string {
  if (!details) {
    return `${PREFIX} Warning: git worktree has uncommitted changes.`
  }

  return `${PREFIX} Warning: git worktree has uncommitted changes. ${details}`
}

export function formatAmbiguousDiscoveryWarning(subject: string, candidates: string[]): string {
  if (candidates.length === 0) {
    return `${PREFIX} Warning: ${subject} is ambiguous.`
  }

  return `${PREFIX} Warning: ${subject} is ambiguous. Candidates: ${candidates.join(', ')}`
}

export function formatWarning(message: string): string {
  return `${PREFIX} Warning: ${message}`
}

export function formatError(message: string): string {
  return `${PREFIX} Error: ${message}`
}

export function formatPreflightFailure(report: PreflightFailureReport): string {
  const lines = [
    report.summary ? formatError(report.summary) : formatError('Preflight failed.'),
    ...report.issues.map((issue) => formatPreflightIssue(issue)),
  ]

  return lines.join('\n')
}

function formatPreflightIssue(issue: PreflightIssue): string {
  if (!issue.path) {
    return `${PREFIX} Preflight: ${issue.message}`
  }

  return `${PREFIX} Preflight: ${issue.path}: ${issue.message}`
}

function countChanges(changes: ReportedChange[], kind: ReportedChangeKind): number {
  return changes.filter((change) => change.kind === kind).length
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
