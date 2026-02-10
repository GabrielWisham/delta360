import { execSync } from 'child_process'

console.log('Running pnpm install --no-frozen-lockfile...')
try {
  execSync('pnpm install --no-frozen-lockfile', { stdio: 'inherit', cwd: '/vercel/share/v0-project' })
  console.log('Done!')
} catch (e) {
  console.error('Install failed:', e.message)
}
