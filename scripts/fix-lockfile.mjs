import { execSync } from 'child_process'

console.log('Regenerating pnpm-lock.yaml...')
try {
  execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit', cwd: process.cwd() })
  console.log('Lockfile regenerated successfully.')
} catch (e) {
  console.error('Failed to regenerate lockfile:', e.message)
  process.exit(1)
}
