export async function runCli(argv: string[]): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write('voltra CLI scaffolding is ready.\n')
    return 0
  }

  process.stderr.write('voltra CLI is not implemented yet.\n')
  return 1
}
