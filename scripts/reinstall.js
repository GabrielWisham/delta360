import { execSync } from 'child_process'

try {
  console.log('Removing pnpm-lock.yaml if exists...')
  try { execSync('rm -f pnpm-lock.yaml', { cwd: '/vercel/share/v0-project', stdio: 'inherit' }) } catch {}
  console.log('Running pnpm install --no-frozen-lockfile...')
  execSync('pnpm install --no-frozen-lockfile', { cwd: '/vercel/share/v0-project', stdio: 'inherit' })
  console.log('Done!')
} catch (e) {
  console.error('Install failed:', e.message)
}
